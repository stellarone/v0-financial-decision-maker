"use server"

import { revalidatePath } from "next/cache"
import {
  RECON_DECISION_STATUS,
  SUGGESTED_ACTIONS,
} from "@/data/constants/bank-reconciliation"
import type {
  CreateEntryDecisionInput,
  MatchDecisionInput,
  ReconDecisionRow,
} from "@/data/types/bank-reconciliation-ui"
import {
  acumaticaReferenceNbr,
  buildApBillPayload,
  buildArInvoicePayload,
  extractCounterpartyFromGpt,
  resolveBankTransactionDrCr,
  resolveMatchedReferenceNbr,
} from "@/lib/bank-reconciliation/build-create-entry-payload"
import { completeBankTransactionReconciliation } from "@/lib/bank-reconciliation/complete-bank-transaction-reconciliation"
import {
  claimReconDecisionForProcessing,
  releaseReconDecisionProcessingClaim,
} from "@/lib/bank-reconciliation/claim-recon-decision-for-processing"
import { resolveMatchModuleFields } from "@/lib/bank-reconciliation/resolve-match-module-fields"
import { createAcumaticaClient } from "@/lib/clients/acumatica"
import { withActionAuth } from "@/lib/services/app/auth/with-action-auth"
import { finopsDb } from "@/lib/services/finops-db"
import { getServerSession } from "@/lib/supabase/server"

export const matchDecision = withActionAuth(
  async (ctx, input: MatchDecisionInput) => {
    const { decisionId } = input

    const { data: decision, error: fetchError } =
      await finopsDb.getReconDecision(decisionId)
    if (fetchError || !decision) {
      throw new Error("Decision not found")
    }

    const row = decision as unknown as ReconDecisionRow
    if (row.organization_id !== ctx.organization.id) {
      throw new Error("Not authorized to modify this decision")
    }

    if (row.suggested_action !== SUGGESTED_ACTIONS.MANUAL_REVIEW) {
      throw new Error(
        `Match action is only allowed for decisions with suggested_action "${SUGGESTED_ACTIONS.MANUAL_REVIEW}".`
      )
    }

    if (row.status === RECON_DECISION_STATUS.COMPLETED) {
      throw new Error("Decision has already been completed")
    }

    const gptResponse = row.gpt_response as Record<string, unknown> | null
    const bankTransaction = row.bank_transaction as Record<string, unknown> | null

    if (!bankTransaction) {
      throw new Error("No bank transaction data found on this decision")
    }

    const matchedSourceType = gptResponse?.matched_source_type as string | null
    const matchedRefNbr = resolveMatchedReferenceNbr(gptResponse)
    const matchedCandidate = gptResponse?.matched_candidate as Record<
      string,
      unknown
    > | null

    if (!matchedSourceType) {
      throw new Error("Decision does not have a matched candidate to reconcile with")
    }

    if (!matchedRefNbr) {
      throw new Error(
        "Decision does not have a matched document reference number; cannot match bank transaction in Acumatica"
      )
    }

    const { module, matchType, businessAccount } = resolveMatchModuleFields(
      matchedSourceType,
      {
        vendor: matchedCandidate?.vendor as string | undefined,
        customer: matchedCandidate?.customer as string | undefined,
      }
    )

    const matchPayload = {
      CashAccount: { value: (bankTransaction.cashAccount as string) || "1000" },
      ExtRefNbr: { value: (bankTransaction.extRefNbr as string) || "" },
      MatchDetails: [
        {
          Matched: { value: true },
          Module: { value: module },
          MatchType: { value: matchType },
          InvoiceNbr: { value: matchedRefNbr },
          BusinessAccount: { value: businessAccount },
        },
      ],
    }

    const session = await getServerSession()
    if (!session) {
      throw new Error("UNAUTHENTICATED")
    }

    const client = createAcumaticaClient({ userJwt: session.access_token })
    await completeBankTransactionReconciliation({
      decisionId,
      organizationId: ctx.organization.id!,
      client,
      matchPayload,
      decisionUpdates: {
        final_doc_type: matchedSourceType || undefined,
        final_ref_nbr: matchedRefNbr,
        reviewed_by: ctx.profile.email || ctx.profile.id,
        reviewed_at: new Date().toISOString(),
      },
    })

    revalidatePath("/bank-reconciliation")
    return { decisionId, status: "completed" }
  }
)

export const createEntryDecision = withActionAuth(
  async (ctx, input: CreateEntryDecisionInput) => {
    const { decisionId } = input

    const { data: decision, error: fetchError } =
      await finopsDb.getReconDecision(decisionId)
    if (fetchError || !decision) {
      throw new Error("Decision not found")
    }

    const row = decision as unknown as ReconDecisionRow
    if (row.organization_id !== ctx.organization.id) {
      throw new Error("Not authorized to modify this decision")
    }

    const allowedActions: string[] = [
      SUGGESTED_ACTIONS.MANUAL_REVIEW,
      SUGGESTED_ACTIONS.CREATE_NEW_ENTRY,
    ]
    if (!allowedActions.includes(row.suggested_action)) {
      throw new Error("Create entry action is not allowed for this decision")
    }

    if (row.status === RECON_DECISION_STATUS.COMPLETED) {
      throw new Error("Decision has already been completed")
    }

    const bankTransaction = row.bank_transaction as Record<string, unknown> | null
    if (!bankTransaction) {
      throw new Error("No bank transaction data found on this decision")
    }

    const drCr = resolveBankTransactionDrCr(bankTransaction)
    const amount = row.amount
    const description =
      row.description || (bankTransaction.description as string) || ""
    const tranDate = row.tran_date
    const gptResponse = row.gpt_response as Record<string, unknown> | null
    const { vendor, customer } = extractCounterpartyFromGpt(gptResponse)

    const session = await getServerSession()
    if (!session) {
      throw new Error("UNAUTHENTICATED")
    }

    const client = createAcumaticaClient({ userJwt: session.access_token })
    const organizationId = ctx.organization.id!
    const reviewedBy = ctx.profile.email || ctx.profile.id

    await claimReconDecisionForProcessing({
      decisionId,
      organizationId,
      reviewedBy,
    })

    let docType: string
    let refNbr: string | undefined

    try {
      if (drCr === "Disbursement") {
        if (!vendor) {
          throw new Error(
            "Cannot create an AP Bill without a vendor. Run reconciliation again or use Match when a vendor candidate is available."
          )
        }

        const expenseAccounts = await client.getTenantExpenseAccounts({
          organizationId,
        })
        const expenseAccount = expenseAccounts[0]?.accountNumber
        if (!expenseAccount) {
          throw new Error("No expense accounts found in Acumatica for this organization")
        }

        const result = await client.createEntity("Bill", {
          organizationId,
          payload: buildApBillPayload({
            vendorId: vendor,
            tranDate,
            description,
            amount,
            expenseAccount,
          }),
        })
        docType = "APBill"
        refNbr = acumaticaReferenceNbr(result)
      } else if (drCr === "Receipt") {
        if (!customer) {
          throw new Error(
            "Cannot create an AR Invoice without a customer. Run reconciliation again or use Match when a customer candidate is available."
          )
        }

        const result = await client.createEntity("Invoice", {
          organizationId,
          payload: buildArInvoicePayload({
            customerId: customer,
            tranDate,
            description,
            amount,
          }),
        })
        docType = "ARInvoice"
        refNbr = acumaticaReferenceNbr(result)
      } else {
        throw new Error(
          `Cannot create entry for bank transaction type "${drCr}"`
        )
      }

      if (!refNbr) {
        throw new Error(
          "Created document did not return a reference number; cannot match bank transaction in Acumatica"
        )
      }

      const { module, matchType, businessAccount } = resolveMatchModuleFields(
        docType,
        { vendor, customer }
      )

      await completeBankTransactionReconciliation({
        decisionId,
        organizationId,
        client,
        matchPayload: {
          CashAccount: { value: (bankTransaction.cashAccount as string) || "1000" },
          ExtRefNbr: { value: (bankTransaction.extRefNbr as string) || "" },
          MatchDetails: [
            {
              Matched: { value: true },
              Module: { value: module },
              MatchType: { value: matchType },
              InvoiceNbr: { value: refNbr },
              BusinessAccount: { value: businessAccount },
            },
          ],
        },
        decisionUpdates: {
          final_doc_type: docType,
          final_ref_nbr: refNbr || undefined,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      await releaseReconDecisionProcessingClaim({ decisionId, organizationId })
      throw error
    }

    revalidatePath("/bank-reconciliation")
    return { decisionId, docType, refNbr, status: "completed" }
  }
)

export const refreshReconDecisions = withActionAuth(async () => {
  revalidatePath("/bank-reconciliation")
  return { refreshed: true }
})

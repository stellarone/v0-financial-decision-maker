import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { RECON_DECISION_STATUS } from "@/data/constants/bank-reconciliation";

type FinopsSchemaClient = { from: (table: string) => ReturnType<SupabaseClient["from"]> };

class FinopsDbService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
          "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
        );
      }
      this.client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    }
    return this.client;
  }

  private getFinopsClient(): FinopsSchemaClient {
    const client = this.getClient() as unknown as {
      schema: (name: string) => FinopsSchemaClient;
    };
    return client.schema("finops");
  }

  async insertReconDecision(payload: {
    organization_id: string;
    source: string;
    tran_id: string;
    company_id: string;
    amount: number;
    tran_date: string;
    description?: string;
    ext_ref_nbr?: string;
    matched_doc_type?: string | null;
    matched_ref_nbr?: string | null;
    matched_candidate_id?: string | null;
    confidence?: number;
    suggested_action: string;
    flag_for_review?: boolean;
    reasoning?: string;
    status: string;
    workflow_version?: string;
    prompt_version?: string;
    gpt_response?: Record<string, unknown>;
    bank_transaction?: Record<string, unknown>;
  }) {
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[FinopsDbService] insertReconDecision error:", error);
      return { data: null, error };
    }
    return { data, error: null };
  }

  async findPendingReconDecisionByTranId(
    organizationId: string,
    tranId: string
  ) {
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("tran_id", tranId)
      .eq("status", RECON_DECISION_STATUS.PENDING)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[FinopsDbService] findPendingReconDecisionByTranId error:",
        error
      );
      return { data: null, error };
    }
    return { data, error: null };
  }

  async listPendingReconDecisionTranIds(organizationId: string) {
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .select("tran_id")
      .eq("organization_id", organizationId)
      .eq("status", RECON_DECISION_STATUS.PENDING);

    if (error) {
      console.error(
        "[FinopsDbService] listPendingReconDecisionTranIds error:",
        error
      );
      return { data: null, error };
    }

    const tranIds = (data ?? [])
      .map((row) => row.tran_id as string)
      .filter((tranId): tranId is string => Boolean(tranId));

    return { data: tranIds, error: null };
  }

  async updateReconDecision(
    id: string,
    updates: {
      status?: string;
      final_doc_type?: string | null;
      final_ref_nbr?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
    }
  ) {
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[FinopsDbService] updateReconDecision error:", error);
      return { data: null, error };
    }
    return { data, error: null };
  }

  async listReconDecisions(
    organizationId: string,
    options: { limit?: number } = {}
  ) {
    const { limit = 200 } = options;
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .select(
        "id, organization_id, tran_id, tran_date, amount, description, ext_ref_nbr, suggested_action, status, confidence, matched_doc_type, matched_ref_nbr, matched_candidate_id, reasoning, flag_for_review, bank_transaction, gpt_response, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[FinopsDbService] listReconDecisions error:", error);
      return { data: null, error };
    }
    return { data: data ?? [], error: null };
  }

  async getReconDecision(id: string) {
    const { data, error } = await this.getFinopsClient()
      .from("recon_decisions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if ((error as PostgrestError).code === "PGRST116") {
        return { data: null, error: null };
      }
      return { data: null, error };
    }
    return { data, error: null };
  }
}

export const finopsDb = new FinopsDbService();

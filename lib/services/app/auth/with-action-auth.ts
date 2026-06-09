import { withOrgAuth } from "@/lib/services/app/auth/guards"
import type { AuthContext } from "@/lib/services/app/auth/types"

export type ActionHandler<TInput, TOutput> = (
  context: AuthContext,
  input: TInput
) => Promise<TOutput>

export type NoInputActionHandler<TOutput> = (
  context: AuthContext
) => Promise<TOutput>

export type ActionResult<T> =
  | { success: true; data: T; error?: string }
  | { success: false; error: string }

export function withActionAuth<TOutput>(
  handler: NoInputActionHandler<TOutput>
): (input?: undefined) => Promise<ActionResult<TOutput>>
export function withActionAuth<TInput, TOutput>(
  handler: ActionHandler<TInput, TOutput>
): (input: TInput) => Promise<ActionResult<TOutput>>
export function withActionAuth<TInput, TOutput>(
  handler: (context: AuthContext, input?: TInput) => Promise<TOutput>
): (input?: TInput) => Promise<ActionResult<TOutput>> {
  return async (input?: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const context = await withOrgAuth()
      if (!context.organization.id) {
        return { success: false, error: "No organization linked to your account" }
      }

      const data = await handler(context, input)
      return { success: true, data }
    } catch (error) {
      console.error("[withActionAuth] Server action error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred"
      return { success: false, error: errorMessage }
    }
  }
}

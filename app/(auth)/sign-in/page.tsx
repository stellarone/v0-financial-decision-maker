import { Zap } from "lucide-react"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in-form"
import { getServerUser } from "@/lib/supabase/server"

const STELLAR_ONE_LEGAL = "https://www.stellarone.io/legal-policies"
const SUPPORT_EMAIL = "missionsupport@stellarone.io"

export default async function SignInPage() {
  const user = await getServerUser()

  if (user) {
    redirect("/cash-calendar")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-b border-border bg-card px-10 py-12 lg:flex lg:border-b-0 lg:border-r">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 20%, oklch(0.35 0.12 250 / 0.45), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 80%, oklch(0.32 0.08 155 / 0.25), transparent 50%)",
            }}
          />
          <div className="relative z-10 flex flex-col gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-adz-blue text-primary-foreground shadow-lg shadow-adz-blue/20">
                <Zap className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-adz-blue">
                  AccountingZero
                </p>
                <p className="text-sm text-muted-foreground">
                  Autonomous finance operations
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-lg text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                Command cash, forecasts, and execution in one workspace.
              </h1>
              <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
                Sign in with your Stellar One account to reach the cash
                calendar, forecast views, and execution queue—secured with the
                same platform authentication as the member portal.
              </p>
            </div>
          </div>

          <p className="relative z-10 text-xs text-muted-foreground">
            The same secure sign-in you use across Stellar One products.
          </p>
        </aside>

        <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-adz-blue text-primary-foreground">
                <Zap className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-adz-blue">
                  AccountingZero
                </p>
                <p className="text-sm text-muted-foreground">Sign in</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the same email and password you use for Stellar One.
            </p>

            <div className="mt-8">
              <SignInForm />
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              By signing in, I agree to{" "}
              <a
                href={STELLAR_ONE_LEGAL}
                className="text-adz-blue underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stellar One&apos;s Terms and Conditions, Privacy Policy, and
                EULA
              </a>
              .
            </p>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Having trouble? Email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-adz-blue underline-offset-2 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

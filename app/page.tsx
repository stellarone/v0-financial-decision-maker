import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/supabase/server"

export default async function Home() {
  const user = await getServerUser()

  redirect(user ? "/cash-calendar" : "/sign-in")
}

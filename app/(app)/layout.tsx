import React from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { withAuth } from "@/lib/services/app/auth/guards"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const auth = await withAuth()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        userEmail={auth.profile.email}
        userName={auth.profile.fullName}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto adz-scrollbar p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

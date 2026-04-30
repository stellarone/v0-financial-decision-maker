import React from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        userEmail="user@stellarone.io"
        userName="User"
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

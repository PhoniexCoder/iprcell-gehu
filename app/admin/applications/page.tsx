"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ApplicationManagement } from "@/components/admin/application-management"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Access denied. Admin privileges required.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
  <div className="flex justify-center w-full px-2 sm:px-4 md:px-8 py-4 sm:py-8 pt-16 sm:pt-8">
        <div className="w-full max-w-4xl">
          <div className="bg-white/90 shadow-xl rounded-2xl p-4 sm:p-8 mb-6 border border-gray-100">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left mb-2">Application Management</h1>
            <p className="text-gray-600 text-center sm:text-left text-base sm:text-lg">Review and manage all patent applications in the system.</p>
          </div>
          <div className="w-full">
            <ApplicationManagement />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

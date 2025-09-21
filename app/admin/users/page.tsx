"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserManagement } from "@/components/admin/user-management"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminUsersPage() {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Approve accounts and manage user roles.</p>
        </div>
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}

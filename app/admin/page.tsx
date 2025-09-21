"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { UserManagement } from "@/components/admin/user-management"
import { ApplicationManagement } from "@/components/admin/application-management"
import { Users, FileText, Clock, CheckCircle, XCircle, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
  })
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    // Live users stats
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users = snapshot.docs.map((d) => d.data() as any)
        const totalUsers = users.length
        const pendingUsers = users.filter((u) => !u.isApproved).length
        setStats((prev) => ({ ...prev, totalUsers, pendingUsers }))
      },
      (err) => {
        console.error("Users stats listener error:", err)
      },
    )

    // Live applications stats
    const unsubApps = onSnapshot(
      collection(db, "applications"),
      (snapshot) => {
        const applications = snapshot.docs.map((d) => d.data() as any)
        const totalApplications = applications.length
        const pendingApplications = applications.filter((a) => a.status === "submitted").length
        const approvedApplications = applications.filter((a) => ["approved", "patent_filed"].includes(a.status)).length
        const rejectedApplications = applications.filter((a) => a.status === "rejected").length
        setStats((prev) => ({
          ...prev,
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
        }))
      },
      (err) => {
        console.error("Applications stats listener error:", err)
      },
    )

    return () => {
      unsubUsers()
      unsubApps()
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users, applications, and system settings.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            description="Registered users in the system"
            icon={Users}
          />
          <StatsCard
            title="Pending Approvals"
            value={stats.pendingUsers}
            description="Users awaiting approval"
            icon={UserCheck}
          />
          <StatsCard
            title="Total Applications"
            value={stats.totalApplications}
            description="All patent applications"
            icon={FileText}
          />
          <StatsCard
            title="Pending Review"
            value={stats.pendingApplications}
            description="Applications under review"
            icon={Clock}
          />
          <StatsCard
            title="Approved"
            value={stats.approvedApplications}
            description="Successfully approved applications"
            icon={CheckCircle}
          />
          <StatsCard
            title="Rejected"
            value={stats.rejectedApplications}
            description="Applications requiring revision"
            icon={XCircle}
          />
        </div>

        {/* Management Sections */}
        <div className="space-y-6">
          <ApplicationManagement />
        </div>
      </div>
    </DashboardLayout>
  )
}

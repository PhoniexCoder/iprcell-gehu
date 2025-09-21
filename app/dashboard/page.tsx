"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ApplicationList } from "@/components/dashboard/application-list"
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const { user } = useAuth()

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        const q = query(collection(db, "applications"), where("applicantEmail", "==", user.email))

        const snapshot = await getDocs(q)
        const applications = snapshot.docs.map((doc) => doc.data())

        const stats = {
          total: applications.length,
          pending: applications.filter((app) => ["draft", "submitted", "under_review"].includes(app.status)).length,
          approved: applications.filter((app) => ["approved", "patent_filed"].includes(app.status)).length,
          rejected: applications.filter((app) => app.status === "rejected").length,
        }

        setStats(stats)
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
  }, [user])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.displayName}. Here's an overview of your patent applications.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Applications"
            value={stats.total}
            description="All your patent applications"
            icon={FileText}
          />
          <StatsCard
            title="Pending Review"
            value={stats.pending}
            description="Applications under review"
            icon={Clock}
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            description="Successfully approved applications"
            icon={CheckCircle}
          />
          <StatsCard
            title="Rejected"
            value={stats.rejected}
            description="Applications that need revision"
            icon={XCircle}
          />
        </div>

        {/* Applications List */}
        <ApplicationList />
      </div>
    </DashboardLayout>
  )
}

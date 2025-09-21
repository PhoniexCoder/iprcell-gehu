"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ApplicationReview } from "@/components/attorney/application-review"
import { FileText, Clock, CheckCircle, XCircle, Award, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AttorneyDashboard() {
  const [stats, setStats] = useState({
    totalReviewed: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    patentsFiled: 0,
    avgScore: 0,
  })
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "patent_attorney") {
      router.push("/dashboard")
      return
    }

    const fetchStats = async () => {
      try {
        // Fetch applications for attorney review
        const appsSnapshot = await getDocs(collection(db, "applications"))
        const applications = appsSnapshot.docs.map((doc) => doc.data())

        // Filter applications that are in review process
        const reviewableApps = applications.filter((app) =>
          ["submitted", "under_review", "approved", "rejected", "patent_filed"].includes(app.status),
        )

        const totalReviewed = applications.filter((app) => app.reviewedBy).length
        const pendingReview = applications.filter((app) => app.status === "submitted").length
        const approved = applications.filter((app) => app.status === "approved").length
        const rejected = applications.filter((app) => app.status === "rejected").length
        const patentsFiled = applications.filter((app) => app.status === "patent_filed").length

        // Calculate average patentability score
        const scoredApps = applications.filter((app) => app.patentabilityScore)
        const avgScore =
          scoredApps.length > 0
            ? scoredApps.reduce((sum, app) => sum + Number.parseFloat(app.patentabilityScore), 0) / scoredApps.length
            : 0

        setStats({
          totalReviewed,
          pendingReview,
          approved,
          rejected,
          patentsFiled,
          avgScore: Math.round(avgScore * 10) / 10,
        })
      } catch (error) {
        console.error("Error fetching attorney stats:", error)
      }
    }

    fetchStats()
  }, [user, router])

  if (user?.role !== "patent_attorney") {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Access denied. Patent Attorney privileges required.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patent Attorney Dashboard</h1>
          <p className="text-gray-600 mt-2">Review patent applications and provide professional assessments.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Applications Reviewed"
            value={stats.totalReviewed}
            description="Total applications you've reviewed"
            icon={FileText}
          />
          <StatsCard
            title="Pending Review"
            value={stats.pendingReview}
            description="New applications awaiting review"
            icon={Clock}
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            description="Applications approved for filing"
            icon={CheckCircle}
          />
          <StatsCard
            title="Rejected"
            value={stats.rejected}
            description="Applications requiring revision"
            icon={XCircle}
          />
          <StatsCard
            title="Patents Filed"
            value={stats.patentsFiled}
            description="Successfully filed patents"
            icon={Award}
          />
          <StatsCard
            title="Avg. Patentability Score"
            value={stats.avgScore > 0 ? `${stats.avgScore}/10` : "N/A"}
            description="Average score across reviews"
            icon={TrendingUp}
          />
        </div>

        {/* Application Review Section */}
        <ApplicationReview />
      </div>
    </DashboardLayout>
  )
}

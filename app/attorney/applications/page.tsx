"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ApplicationReview } from "@/components/attorney/application-review"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AttorneyApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "patent_attorney") {
      router.push("/dashboard")
    }
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Application Review</h1>
          <p className="text-gray-600 mt-2">
            Review patent applications and provide professional assessments for patentability.
          </p>
        </div>

        <ApplicationReview />
      </div>
    </DashboardLayout>
  )
}

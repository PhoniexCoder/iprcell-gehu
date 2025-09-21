"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ApplicationList } from "@/components/dashboard/application-list"

export default function ApplicationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Applications</h1>
          <p className="text-gray-600 mt-2">View and manage your patent applications.</p>
        </div>

        <ApplicationList />
      </div>
    </DashboardLayout>
  )
}

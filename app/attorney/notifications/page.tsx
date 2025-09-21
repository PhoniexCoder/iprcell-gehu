"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function AttorneyNotificationsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-gray-600">No notifications yet.</p>
      </div>
    </DashboardLayout>
  )
}

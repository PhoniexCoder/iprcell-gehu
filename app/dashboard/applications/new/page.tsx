"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ApplicationForm } from "@/components/applications/application-form"

export default function NewApplicationPage() {
  return (
    <DashboardLayout>
      <ApplicationForm />
    </DashboardLayout>
  )
}

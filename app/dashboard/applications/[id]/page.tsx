"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { PatentApplication } from "@/lib/types"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, User, ArrowLeft, Link as LinkIcon } from "lucide-react"

const statusColors: Record<PatentApplication["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  patent_filed: "bg-purple-100 text-purple-800",
  published: "bg-indigo-100 text-indigo-800",
}

export default function ApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ""
  const { user } = useAuth()
  const [app, setApp] = useState<PatentApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const ref = doc(db, "applications", id)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError("Application not found")
          setApp(null)
        } else {
          const data = { id: snap.id, ...snap.data() } as PatentApplication
          setApp(data)
          setError(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error("Error loading application:", err)
        setError("Failed to load application")
        setLoading(false)
      },
    )
    return () => unsub()
  }, [id])

  const formatDate = (value: any) => {
    try {
      const d = value?.toDate ? value.toDate() : value
      return d ? new Date(d).toLocaleString() : "N/A"
    } catch {
      return "N/A"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard/applications")}> 
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <h1 className="text-2xl font-semibold">Application Details</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
          </Card>
        ) : !app ? (
          <Card>
            <CardContent className="py-10 text-center">No data</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{app.title}</CardTitle>
                  <Badge className={statusColors[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 whitespace-pre-wrap">{app.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{app.applicationNumber || "Pending ID"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(app.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{app.inventors?.join(", ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Applicant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-gray-700">
                  <div><span className="font-medium">Name:</span> {app.applicantName}</div>
                  <div><span className="font-medium">Email:</span> {app.applicantEmail}</div>
                  <div><span className="font-medium">Department:</span> {app.department}</div>
                  <div><span className="font-medium">ID:</span> {app.employeeId}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  {app.attachments?.length ? (
                    <ul className="space-y-2">
                      {app.attachments.map((f) => (
                        <li key={f.id} className="flex items-center justify-between border rounded p-2">
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{f.name}</div>
                            <div className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <a href={f.url} target="_blank" rel="noreferrer">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Open
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">No attachments</div>
                  )}
                </CardContent>
              </Card>

              {/* Admin Review */}
              {app.reviewComments && (
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {app.reviewedAt && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Reviewed on:</span> {formatDate(app.reviewedAt)}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Comments:</div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.reviewComments}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patent Attorney Review */}
              {(app.patentabilityScore || app.noveltyAssessment || app.recommendations) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Patent Attorney Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {app.patentabilityScore && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Patentability Score:</div>
                        <p className="text-sm text-gray-600">{app.patentabilityScore}</p>
                      </div>
                    )}
                    {app.noveltyAssessment && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Novelty Assessment:</div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.noveltyAssessment}</p>
                      </div>
                    )}
                    {app.recommendations && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Recommendations:</div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.recommendations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* PA Remarks (Approved by Admin) */}
              {app.paRemarks && app.paRemarksApprovedByAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>Patent Attorney Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.paRemarks}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

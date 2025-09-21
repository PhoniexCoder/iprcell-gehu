"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { PatentApplication } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, User, Eye } from "lucide-react"
import Link from "next/link"

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  patent_filed: "bg-purple-100 text-purple-800",
}

const statusLabels = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  patent_filed: "Patent Filed",
}

export function ApplicationList() {
  const [applications, setApplications] = useState<PatentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const formatDate = (value: any) => {
    try {
      const d = value?.toDate ? value.toDate() : value
      return d ? new Date(d).toLocaleDateString() : "N/A"
    } catch {
      return "N/A"
    }
  }

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "applications"), where("applicantEmail", "==", user.email))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps = (snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PatentApplication[]).sort((a, b) => {
          const ad = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : (a.createdAt as any)
          const bd = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : (b.createdAt as any)
          return new Date(bd || 0).getTime() - new Date(ad || 0).getTime()
        })
        setApplications(apps)
        setLoading(false)
      },
      (error) => {
        console.error("Error loading applications:", error)
        setApplications([])
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Applications</CardTitle>
        <Button asChild size="sm">
          <Link href="/dashboard/applications/new">
            <FileText className="h-4 w-4 mr-2" />
            New Application
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-500 mb-4">Get started by submitting your first patent application.</p>
            <Button asChild>
              <Link href="/dashboard/applications/new">Create Application</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{app.title}</h3>
                      <Badge className={statusColors[app.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                        {statusLabels[app.status as keyof typeof statusLabels] || app.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{app.description}</p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{app.applicationNumber || "Pending ID"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(app.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{app.inventors.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/applications/${app.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { PatentApplication } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Calendar, User, Eye, Trash2, MessageSquare } from "lucide-react"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { NotificationTemplates, getUserIdsByRole, createNotificationsForUsers } from "@/lib/notifications"

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  patent_filed: "bg-purple-100 text-purple-800",
  published: "bg-indigo-100 text-indigo-800",
}

const statusLabels = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  patent_filed: "Patent Filed",
  published: "Published",
}

export function ApplicationList() {
  const [applications, setApplications] = useState<PatentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { user } = useAuth()
  const formatDate = (value: any) => {
    try {
      const d = value?.toDate ? value.toDate() : value
      return d ? new Date(d).toLocaleDateString() : "N/A"
    } catch {
      return "N/A"
    }
  }

  const handleDelete = async (app: PatentApplication) => {
    if (!user) return
    setDeleting(app.id)
    try {
      await updateDoc(doc(db, "applications", app.id), {
        deletedAt: new Date(),
        deletedBy: user.uid,
        updatedAt: new Date(),
      })

      // Notify admins about deletion
      const adminIds = await getUserIdsByRole("admin")
      await createNotificationsForUsers(adminIds, {
        ...NotificationTemplates.applicationDeleted(
          app.applicationNumber || "Pending ID",
          user.displayName,
          app.title,
        ),
        read: false,
        applicationId: app.id,
      })

      toast({
        title: "Application deleted",
        description: "Your application has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting application:", error)
      toast({
        title: "Error",
        description: "Failed to delete application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "applications"),
      where("applicantEmail", "==", user.email)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps = (snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PatentApplication[])
          .filter((app) => !app.deletedAt) // Filter out deleted apps in client
          .sort((a, b) => {
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
    <>
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
            <div className="rounded-lg border p-6 text-center sm:p-10">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500 mb-4">Get started by submitting your first patent application.</p>
              <Button asChild>
                <Link href="/dashboard/applications/new">Create Application</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {applications.map((app) => (
                <div key={app.id} className="rounded-lg border bg-card hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 truncate mb-1" title={app.title}>
                          {app.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[app.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                            {statusLabels[app.status as keyof typeof statusLabels] || app.status}
                          </Badge>
                          {app.patentType && (
                            <Badge variant="outline" className="text-xs">
                              {app.patentType.charAt(0).toUpperCase() + app.patentType.slice(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {app.description}
                    </p>

                    {/* Meta Information */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono truncate">{app.applicationNumber || "Pending Assignment"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Submitted: {formatDate(app.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={app.inventors.join(", ")}>
                          {app.inventors.length === 1 ? app.inventors[0] : `${app.inventors[0]} +${app.inventors.length - 1} more`}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm" asChild className="w-full justify-start">
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>

                      {/* Admin Review */}
                      {app.reviewComments && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Admin Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Admin Review</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                              <div>
                                <Label className="font-semibold">Application</Label>
                                <p className="text-sm text-gray-700 mt-1">{app.title}</p>
                              </div>
                              {app.reviewedAt && (
                                <div>
                                  <Label className="font-semibold">Reviewed On</Label>
                                  <p className="text-sm text-gray-700 mt-1">{formatDate(app.reviewedAt)}</p>
                                </div>
                              )}
                              <div>
                                <Label className="font-semibold">Comments</Label>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{app.reviewComments}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* PA Remarks */}
                      {app.paRemarks && app.paRemarksApprovedByAdmin && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Patent Attorney Remarks
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Patent Attorney Remarks</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                              <div>
                                <Label className="font-semibold">Application</Label>
                                <p className="text-sm text-gray-700 mt-1">{app.title}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Remarks</Label>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{app.paRemarks}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            disabled={deleting === app.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Application
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{app.title}"? This action cannot be undone. The admin
                              will be notified of this deletion.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(app)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

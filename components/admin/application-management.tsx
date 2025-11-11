"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, doc, updateDoc, query, orderBy, runTransaction } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { PatentApplication } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FileText, Calendar, User, Search, Eye, MessageSquare, Send, ExternalLink } from "lucide-react"
import { NotificationTemplates, createNotificationsForUsers, getUserIdsByRole, getUserIdByEmail } from "@/lib/notifications"
import { useAuth } from "@/components/providers/auth-provider"

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

export function ApplicationManagement() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<PatentApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<PatentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedApp, setSelectedApp] = useState<PatentApplication | null>(null)
  const [reviewData, setReviewData] = useState({
    status: "",
    comments: "",
  })
  const formatDate = (value: any) => {
    try {
      const d = value?.toDate ? value.toDate() : value
      return d ? new Date(d).toLocaleDateString() : "N/A"
    } catch {
      return "N/A"
    }
  }

  const getPrefixMMYY = () => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yy = String(d.getFullYear() % 100).padStart(2, "0")
    return `${mm}${yy}`
  }

  const getNextApplicationNumber = async (): Promise<string> => {
    const prefix = getPrefixMMYY()
    const counterId = `applications_${prefix}`
    const counterRef = doc(db, "counters", counterId)

    const nextSeq = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef)
      let current = 100
      if (snap.exists()) {
        const data = snap.data() as any
        if (typeof data.current === "number") current = data.current
      }
      const nextVal = current + 1 // 101, 102, ...
      tx.set(counterRef, { current: nextVal, prefix }, { merge: true })
      return nextVal
    })

    return `${prefix}-${nextSeq}`
  }

  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PatentApplication[]

      setApplications(apps)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.applicationNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }, [applications, searchTerm, statusFilter])

  const handleReviewSubmit = async () => {
    if (!selectedApp || !reviewData.status) return
    if (!user) {
      console.warn("Not authenticated")
      return
    }

    try {
      await updateDoc(doc(db, "applications", selectedApp.id), {
        status: reviewData.status,
        reviewComments: reviewData.comments,
        reviewedAt: new Date(),
        reviewedBy: "Admin", // In real app, use current admin's name
        updatedAt: new Date(),
      })

      // Notify applicant if rejected from Admin review
      if (reviewData.status === "rejected") {
        const uid = selectedApp.applicantUid || (await getUserIdByEmail(selectedApp.applicantEmail))
        if (uid) {
          const tpl = NotificationTemplates.applicationRejected(
            selectedApp.applicationNumber || "",
            reviewData.comments,
          )
          await createNotificationsForUsers([uid], {
            ...tpl,
            read: false,
            applicationId: selectedApp.id,
          })
        }
      }

      setSelectedApp(null)
      setReviewData({ status: "", comments: "" })
    } catch (error) {
      console.error("Error updating application:", error)
    }
  }

  const handleForwardToPA = async (app: PatentApplication) => {
    if (!user) {
      console.warn("Not authenticated")
      return
    }
    try {
      const assignedNumber = app.applicationNumber || (await getNextApplicationNumber())
      await updateDoc(doc(db, "applications", app.id), {
        status: "approved",
        applicationNumber: assignedNumber,
        forwardedToPAAt: new Date(),
        forwardedBy: "Admin",
        updatedAt: new Date(),
      })

      // Notify PA users
      const paIds = await getUserIdsByRole("patent_attorney")
      await createNotificationsForUsers(paIds, {
        ...NotificationTemplates.paAssignment(assignedNumber, app.title),
        read: false,
        applicationId: app.id,
        type: "info",
      })

      // Notify applicant
      const applicantUid = app.applicantUid || (await getUserIdByEmail(app.applicantEmail))
      if (applicantUid) {
        await createNotificationsForUsers([applicantUid], {
          title: "Application Forwarded",
          message: "Your application has been forwarded to the Patent Attorney for review.",
          type: "info",
          read: false,
          applicationId: app.id,
        })
      }
    } catch (error) {
      console.error("Error forwarding to PA:", error)
    }
  }

  const handleApprovePARemarks = async (app: PatentApplication) => {
    if (!user) return
    try {
      await updateDoc(doc(db, "applications", app.id), {
        paRemarksApprovedByAdmin: true,
        updatedAt: new Date(),
      })

      // Notify applicant that PA remarks are now available
      const uid = app.applicantUid || (await getUserIdByEmail(app.applicantEmail))
      if (uid) {
        await createNotificationsForUsers([uid], {
          ...NotificationTemplates.paRemarksAvailable(app.applicationNumber || ""),
          read: false,
          applicationId: app.id,
        })
      }
    } catch (error) {
      console.error("Error approving PA remarks:", error)
    }
  }

  const handleMarkAsPublished = async (app: PatentApplication) => {
    if (!user) return
    try {
      await updateDoc(doc(db, "applications", app.id), {
        status: "published",
        updatedAt: new Date(),
      })

      // Notify applicant via admin
      const uid = app.applicantUid || (await getUserIdByEmail(app.applicantEmail))
      if (uid) {
        await createNotificationsForUsers([uid], {
          ...NotificationTemplates.applicationPublished(app.applicationNumber || ""),
          read: false,
          applicationId: app.id,
        })
      }
    } catch (error) {
      console.error("Error marking as published:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Management</CardTitle>
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
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Filters first on mobile */}
        <div className="order-1 md:order-none">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="patent_filed">Patent Filed</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notification dropdown below filters on mobile, right-aligned on desktop */}
        <div className="order-2 md:order-none md:ml-auto w-full md:w-auto">
          {/* Replace with your real component */}
          {/* <NotificationsDropdown /> */}
          {/* ...existing code... */}
        </div>
      </div>

      {/* ...existing code... rest of page (table/list) ... */}
      <Card>
        <CardHeader>
          <CardTitle>Application Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No applications found matching your criteria.</p>
              </div>
            ) : (
              filteredApplications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{app.title}</h3>
                        <Badge className={statusColors[app.status]}>{statusLabels[app.status]}</Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">{app.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{app.applicationNumber}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(app.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{app.applicantName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{app.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full md:w-auto flex-row gap-2 overflow-x-auto">
                      {app.status === "submitted" && (
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleForwardToPA(app)}>
                          <Send className="h-4 w-4 mr-2" />
                          Approve & Forward
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="shrink-0">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{app.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-medium">Application Number</Label>
                              <p className="text-sm text-gray-600">{app.applicationNumber}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Description</Label>
                              <p className="text-sm text-gray-600">{app.description}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Inventors</Label>
                              <p className="text-sm text-gray-600">{app.inventors.join(", ")}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Applicant</Label>
                              <p className="text-sm text-gray-600">
                                {app.applicantName} ({app.applicantEmail})
                              </p>
                            </div>
                            <div>
                              <Label className="font-medium">Department</Label>
                              <p className="text-sm text-gray-600">{app.department}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Attachments</Label>
                              {app.attachments && app.attachments.length > 0 ? (
                                <ul className="mt-2 space-y-2">
                                  {app.attachments.map((f) => (
                                    <li key={f.id} className="flex items-center justify-between border rounded p-2">
                                      <div className="truncate">
                                        <div className="text-sm font-medium truncate">{f.name}</div>
                                        <div className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                                      </div>
                                      <Button asChild variant="outline" size="sm">
                                        <a href={f.url} target="_blank" rel="noreferrer">
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Open
                                        </a>
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1">No attachments</p>
                              )}
                            </div>
                            {app.reviewComments && (
                              <div>
                                <Label className="font-medium">Review Comments</Label>
                                <p className="text-sm text-gray-600">{app.reviewComments}</p>
                              </div>
                            )}
                            {app.paRemarks && (
                              <div>
                                <Label className="font-medium">PA Remarks</Label>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.paRemarks}</p>
                                {!app.paRemarksApprovedByAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => handleApprovePARemarks(app)}
                                  >
                                    Approve & Share with Applicant
                                  </Button>
                                )}
                                {app.paRemarksApprovedByAdmin && (
                                  <Badge variant="outline" className="mt-2 text-green-600">
                                    Approved - Visible to Applicant
                                  </Badge>
                                )}
                              </div>
                            )}
                            {app.status === "patent_filed" && (
                              <div className="pt-4 border-t">
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleMarkAsPublished(app)}
                                >
                                  Mark as Published
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="shrink-0" onClick={() => {
                              setSelectedApp(app)
                              setReviewData({ status: app.status, comments: app.reviewComments || "" })
                            }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Application</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={reviewData.status}
                                onValueChange={(value) => setReviewData({ ...reviewData, status: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="patent_filed">Patent Filed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="comments">Review Comments</Label>
                              <Textarea
                                id="comments"
                                placeholder="Add your review comments..."
                                value={reviewData.comments}
                                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                                rows={4}
                              />
                            </div>

                            <Button onClick={handleReviewSubmit} className="w-full">
                              Submit Review
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

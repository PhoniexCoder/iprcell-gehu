"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { PatentApplication } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Calendar, User, Search, Eye, MessageSquare, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react"
import { NotificationTemplates, createNotificationsForUsers, getUserIdByEmail } from "@/lib/notifications"

const statusColors = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  patent_filed: "bg-purple-100 text-purple-800",
}

const statusLabels = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  patent_filed: "Patent Filed",
}

export function ApplicationReview() {
  const [applications, setApplications] = useState<PatentApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<PatentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("approved")
  const [selectedApp, setSelectedApp] = useState<PatentApplication | null>(null)
  const [reviewData, setReviewData] = useState({
    status: "",
    comments: "",
    patentabilityScore: "",
    noveltyAssessment: "",
    recommendations: "",
  })
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
    // Patent attorneys should see applications only after admin has approved/forwarded
    const q = query(
      collection(db, "applications"),
      where("status", "in", ["approved", "rejected", "patent_filed"]),
      orderBy("createdAt", "desc"),
    )

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

    try {
      const updateData: any = {
        status: reviewData.status,
        reviewComments: reviewData.comments,
        reviewedAt: new Date(),
        reviewedBy: user?.displayName || "Patent Attorney",
        updatedAt: new Date(),
      }

      // Add attorney-specific fields
      if (reviewData.patentabilityScore) {
        updateData.patentabilityScore = reviewData.patentabilityScore
      }
      if (reviewData.noveltyAssessment) {
        updateData.noveltyAssessment = reviewData.noveltyAssessment
      }
      if (reviewData.recommendations) {
        updateData.recommendations = reviewData.recommendations
      }

      await updateDoc(doc(db, "applications", selectedApp.id), updateData)

      // Notify applicant about attorney decision
      const uid = await getUserIdByEmail(selectedApp.applicantEmail)
      if (uid) {
        let tpl: { title: string; message: string; type: "info" | "success" | "warning" | "error" } | null = null
        if (reviewData.status === "under_review") {
          tpl = NotificationTemplates.applicationUnderReview(selectedApp.applicationNumber || "")
        } else if (reviewData.status === "approved") {
          tpl = NotificationTemplates.applicationApproved(selectedApp.applicationNumber || "")
        } else if (reviewData.status === "rejected") {
          tpl = NotificationTemplates.applicationRejected(
            selectedApp.applicationNumber || "",
            reviewData.comments,
          )
        } else if (reviewData.status === "patent_filed") {
          tpl = NotificationTemplates.patentFiled(selectedApp.applicationNumber || "")
        }

        if (tpl) {
          await createNotificationsForUsers([uid], {
            ...tpl,
            read: false,
            applicationId: selectedApp.id,
          })
        }
      }

      setSelectedApp(null)
      setReviewData({
        status: "",
        comments: "",
        patentabilityScore: "",
        noveltyAssessment: "",
        recommendations: "",
      })
    } catch (error) {
      console.error("Error updating application:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patent Application Review</CardTitle>
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
      <CardHeader>
        <CardTitle>Patent Application Review</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="patent_filed">Patent Filed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No applications found matching your criteria.</p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{app.title}</h3>
                      <Badge className={statusColors[app.status as keyof typeof statusColors]}>
                        {statusLabels[app.status as keyof typeof statusLabels]}
                      </Badge>
                      {app.status === "approved" && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Needs Review
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{app.description}</p>

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

                    {app.reviewedBy && (
                      <div className="mt-2 text-xs text-gray-500">
                        Reviewed by {app.reviewedBy} on {formatDate(app.reviewedAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{app.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Application Number</Label>
                              <p className="text-sm text-gray-600">{app.applicationNumber}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Status</Label>
                              <Badge className={statusColors[app.status as keyof typeof statusColors]}>
                                {statusLabels[app.status as keyof typeof statusLabels]}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <Label className="font-medium">Description</Label>
                            <p className="text-sm text-gray-600 mt-1">{app.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Inventors</Label>
                              <p className="text-sm text-gray-600">{app.inventors.join(", ")}</p>
                            </div>
                            <div>
                              <Label className="font-medium">Department</Label>
                              <p className="text-sm text-gray-600">{app.department}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="font-medium">Applicant Information</Label>
                            <p className="text-sm text-gray-600">
                              {app.applicantName} ({app.applicantEmail})
                            </p>
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
                              <Label className="font-medium">Previous Review Comments</Label>
                              <p className="text-sm text-gray-600 mt-1">{app.reviewComments}</p>
                            </div>
                          )}

                          {app.patentabilityScore && (
                            <div>
                              <Label className="font-medium">Patentability Score</Label>
                              <p className="text-sm text-gray-600 mt-1">{app.patentabilityScore}</p>
                            </div>
                          )}

                          {app.noveltyAssessment && (
                            <div>
                              <Label className="font-medium">Novelty Assessment</Label>
                              <p className="text-sm text-gray-600 mt-1">{app.noveltyAssessment}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app)
                            setReviewData({
                              status: app.status === "submitted" ? "under_review" : app.status,
                              comments: app.reviewComments || "",
                              patentabilityScore: app.patentabilityScore || "",
                              noveltyAssessment: app.noveltyAssessment || "",
                              recommendations: app.recommendations || "",
                            })
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Patent Review - {selectedApp?.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Alert>
                            <MessageSquare className="h-4 w-4" />
                            <AlertDescription>
                              Provide your professional assessment of this patent application's viability and
                              recommendations.
                            </AlertDescription>
                          </Alert>

                          <div>
                            <Label htmlFor="status">Review Decision</Label>
                            <Select
                              value={reviewData.status}
                              onValueChange={(value) => setReviewData({ ...reviewData, status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select decision" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="under_review">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Under Review
                                  </div>
                                </SelectItem>
                                <SelectItem value="approved">
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve for Patent Filing
                                  </div>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <div className="flex items-center">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject Application
                                  </div>
                                </SelectItem>
                                <SelectItem value="patent_filed">
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Patent Filed
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="patentabilityScore">Patentability Score (1-10)</Label>
                            <Input
                              id="patentabilityScore"
                              type="number"
                              min="1"
                              max="10"
                              placeholder="Rate the patentability (1-10)"
                              value={reviewData.patentabilityScore}
                              onChange={(e) => setReviewData({ ...reviewData, patentabilityScore: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="noveltyAssessment">Novelty Assessment</Label>
                            <Textarea
                              id="noveltyAssessment"
                              placeholder="Assess the novelty and uniqueness of the invention..."
                              value={reviewData.noveltyAssessment}
                              onChange={(e) => setReviewData({ ...reviewData, noveltyAssessment: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="comments">Review Comments</Label>
                            <Textarea
                              id="comments"
                              placeholder="Provide detailed feedback and comments..."
                              value={reviewData.comments}
                              onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label htmlFor="recommendations">Recommendations</Label>
                            <Textarea
                              id="recommendations"
                              placeholder="Provide recommendations for next steps..."
                              value={reviewData.recommendations}
                              onChange={(e) => setReviewData({ ...reviewData, recommendations: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <Button onClick={handleReviewSubmit} className="w-full">
                            Submit Professional Review
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
  )
}

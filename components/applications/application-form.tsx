"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUploader } from "@/components/file-upload/file-uploader"
import type { PatentApplication, FileAttachment } from "@/lib/types"
import { Loader2, Plus, Minus, Eye } from "lucide-react"
import { NotificationTemplates, createNotificationsForUsers, getUserIdsByRole, getUserIdByEmail } from "@/lib/notifications"
import { toast } from "@/hooks/use-toast"

export function ApplicationForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    inventors: [""],
    patentType: "" as "utility" | "design" | "publish" | "",
  })
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // App ID/application number is assigned by Admin when forwarding to PA

  const addInventor = () => {
    setFormData({
      ...formData,
      inventors: [...formData.inventors, ""],
    })
  }

  const removeInventor = (index: number) => {
    if (formData.inventors.length > 1) {
      setFormData({
        ...formData,
        inventors: formData.inventors.filter((_, i) => i !== index),
      })
    }
  }

  const updateInventor = (index: number, value: string) => {
    const updatedInventors = [...formData.inventors]
    updatedInventors[index] = value
    setFormData({
      ...formData,
      inventors: updatedInventors,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError("")

    // Validate form
    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Please fill in all required fields")
      setLoading(false)
      return
    }

    if (!formData.patentType) {
      setError("Please select a patent type")
      setLoading(false)
      return
    }

    const validInventors = formData.inventors.filter((inv) => inv.trim())
    if (validInventors.length === 0) {
      setError("Please add at least one inventor")
      setLoading(false)
      return
    }

    try {
      const applicationData: Omit<PatentApplication, "id"> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        inventors: validInventors,
        patentType: formData.patentType,
        applicantName: user.displayName,
        applicantEmail: user.email,
        applicantUid: user.uid,
        department: user.department || "",
        employeeId: user.employeeId || "",
        status: "submitted",
        attachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const docRef = await addDoc(collection(db, "applications"), applicationData)

      // Notify Admin about new submission
      const adminIds = await getUserIdsByRole("admin")
      await createNotificationsForUsers(adminIds, {
        ...NotificationTemplates.adminNewSubmission(applicationData.title, user.displayName),
        read: false,
        applicationId: docRef.id,
      })

  // Notify and go to list view
  toast({ title: "Application submitted", description: "Your application has been submitted successfully." })
  router.push(`/dashboard`)
    } catch (error) {
      console.error("Error creating application:", error)
      setError("Failed to create application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!user) return

    setLoading(true)
    setError("")

    try {
      const applicationData: Omit<PatentApplication, "id"> = {
        title: formData.title.trim() || "Untitled Application",
        description: formData.description.trim() || "No description provided",
        inventors: formData.inventors.filter((inv) => inv.trim()),
        patentType: formData.patentType || undefined,
        applicantName: user.displayName,
        applicantEmail: user.email,
        applicantUid: user.uid,
        department: user.department || "",
        employeeId: user.employeeId || "",
        status: "draft",
        attachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

    const docRef = await addDoc(collection(db, "applications"), applicationData)
    toast({ title: "Draft saved", description: "Your draft has been saved." })
    router.push(`/dashboard/applications`)
    } catch (error) {
      console.error("Error saving draft:", error)
      setError("Failed to save draft. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Patent Application</h1>
        <p className="text-gray-600 mt-2">
          Submit your invention for patent consideration. All fields marked with * are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide the fundamental details of your invention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Invention Title *</Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title for your invention"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="patentType">Patent Type *</Label>
              <Select
                value={formData.patentType}
                onValueChange={(value: "utility" | "design" | "publish") =>
                  setFormData({ ...formData, patentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utility">Utility Patent</SelectItem>
                  <SelectItem value="design">Design Patent</SelectItem>
                  <SelectItem value="publish">Publish Patent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Utility: functional inventions; Design: aesthetic/ornamental; Publish: research publication
              </p>
            </div>

            <div>
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a comprehensive description of your invention, including its purpose, functionality, and unique features..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventors */}
        <Card>
          <CardHeader>
            <CardTitle>Inventors</CardTitle>
            <CardDescription>List all individuals who contributed to this invention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.inventors.map((inventor, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Label htmlFor={`inventor-${index}`}>Inventor {index + 1}</Label>
                  <Input
                    id={`inventor-${index}`}
                    placeholder="Full name of inventor"
                    value={inventor}
                    onChange={(e) => updateInventor(index, e.target.value)}
                  />
                </div>
                {formData.inventors.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeInventor(index)}
                    className="mt-6"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addInventor} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Inventor
            </Button>
          </CardContent>
        </Card>

        {/* File Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
            <CardDescription>
              Upload relevant documents such as technical drawings, research papers, prototypes images, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFilesUploaded={setAttachments}
              existingFiles={attachments}
              maxFiles={10}
              maxSizePerFile={10}
              acceptedTypes={["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
            />
            <p className="text-xs text-gray-500 mt-2">
              * Only .docx (Word) files are accepted. Maximum 10 files, 10MB each.
            </p>
          </CardContent>
        </Card>

        {/* Applicant Information (Auto-filled) */}
        <Card>
          <CardHeader>
            <CardTitle>Applicant Information</CardTitle>
            <CardDescription>This information is automatically filled from your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Applicant Name</Label>
                <Input value={user?.displayName || ""} disabled />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={user?.department || ""} disabled />
              </div>
              <div>
                <Label>Employee/Student ID</Label>
                <Input value={user?.employeeId || ""} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Application Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="font-semibold">Title</Label>
                  <p className="text-sm text-gray-700 mt-1">{formData.title || "No title provided"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Patent Type</Label>
                  <p className="text-sm text-gray-700 mt-1 capitalize">
                    {formData.patentType ? `${formData.patentType} Patent` : "Not selected"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Description</Label>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {formData.description || "No description provided"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Inventors</Label>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                    {formData.inventors
                      .filter((inv) => inv.trim())
                      .map((inv, i) => (
                        <li key={i}>{inv}</li>
                      ))}
                  </ul>
                </div>
                <div>
                  <Label className="font-semibold">Attachments</Label>
                  {attachments.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                      {attachments.map((file) => (
                        <li key={file.id}>{file.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No attachments</p>
                  )}
                </div>
                <div>
                  <Label className="font-semibold">Applicant</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {user?.displayName} ({user?.email})
                  </p>
                  <p className="text-sm text-gray-700">
                    {user?.department} - {user?.employeeId}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex-1 bg-transparent"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as Draft
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  )
}

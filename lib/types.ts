export interface User {
  uid: string
  email: string
  displayName: string
  role: "user" | "admin" | "patent_attorney"
  department?: string
  employeeId?: string
  createdAt: Date
  isApproved: boolean
}

export interface PatentApplication {
  id: string
  applicationNumber?: string
  title: string
  description: string
  inventors: string[]
  applicantName: string
  applicantEmail: string
  applicantUid?: string
  department: string
  employeeId: string
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "patent_filed"
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewComments?: string
  patentabilityScore?: string
  noveltyAssessment?: string
  recommendations?: string
  attachments: FileAttachment[]
  createdAt: Date
  updatedAt: Date
  forwardedToPAAt?: Date
  forwardedBy?: string
}

export interface FileAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: Date
  applicationId?: string
}

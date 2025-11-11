import { collection, addDoc, doc, updateDoc, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import type { Notification } from "./types"

export const createNotification = async (notification: Omit<Notification, "id" | "createdAt">) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

export const getUserIdsByRole = async (role: "user" | "admin" | "patent_attorney"): Promise<string[]> => {
  try {
    const q = query(collection(db, "users"), where("role", "==", role))
    const snap = await getDocs(q)
    return snap.docs.map((d) => (d.data() as any).uid as string)
  } catch (e) {
    console.error("Error fetching user IDs by role:", e)
    return []
  }
}

export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const data = snap.docs[0].data() as any
    return (data.uid as string) || null
  } catch (e) {
    console.error("Error fetching user ID by email:", e)
    return null
  }
}

export const createNotificationsForUsers = async (
  userIds: string[],
  base: Omit<Notification, "id" | "createdAt" | "userId">,
) => {
  await Promise.all(
    userIds.map((uid) =>
      createNotification({
        userId: uid,
        ...base,
      }),
    ),
  )
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

export const subscribeToUserNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[]

      callback(notifications)
    },
    (error) => {
      console.error(
        "Notifications listener error. If this is an index error, create a composite index on 'notifications' (userId ASC, createdAt DESC).",
        error,
      )
    },
  )
}

// Notification templates for different events
export const NotificationTemplates = {
  applicationSubmitted: (applicationNumber: string) => ({
    title: "Application Submitted",
    message: `Your patent application ${applicationNumber} has been successfully submitted and is awaiting review.`,
    type: "success" as const,
  }),

  applicationUnderReview: (applicationNumber: string) => ({
    title: "Application Under Review",
    message: `Your patent application ${applicationNumber} is now under review by our patent attorney.`,
    type: "info" as const,
  }),

  applicationApproved: (applicationNumber: string) => ({
    title: "Application Approved",
    message: `Congratulations! Your patent application ${applicationNumber} has been approved for patent filing.`,
    type: "success" as const,
  }),

  applicationRejected: (applicationNumber: string, reason?: string) => ({
    title: "Application Requires Revision",
    message: `Your patent application ${applicationNumber} requires revision. ${reason ? `Reason: ${reason}` : "Please check the review comments for details."}`,
    type: "warning" as const,
  }),

  patentFiled: (applicationNumber: string) => ({
    title: "Patent Filed",
    message: `Your patent application ${applicationNumber} has been successfully filed with the patent office.`,
    type: "success" as const,
  }),

  adminNewSubmission: (title: string, applicantName: string) => ({
    title: "New Application Submitted",
    message: `${applicantName} submitted a new application: ${title}.`,
    type: "info" as const,
  }),

  paAssignment: (applicationNumber?: string, title?: string) => ({
    title: "New Application Assigned",
    message: `A new application${applicationNumber ? ` (${applicationNumber})` : ""} is assigned for your review${
      title ? `: ${title}` : ""
    }.`,
    type: "info" as const,
  }),

  accountApproved: () => ({
    title: "Account Approved",
    message: "Your account has been approved! You can now access all IPR Cell features.",
    type: "success" as const,
  }),

  accountRejected: () => ({
    title: "Account Access Revoked",
    message: "Your account access has been revoked. Please contact the administrator for more information.",
    type: "error" as const,
  }),

  applicationDeleted: (applicationNumber: string, applicantName: string, title: string) => ({
    title: "Application Deleted by User",
    message: `${applicantName} deleted their application ${applicationNumber}: "${title}".`,
    type: "warning" as const,
  }),

  applicationPublished: (applicationNumber: string) => ({
    title: "Patent Published",
    message: `Congratulations! Your patent application ${applicationNumber} has been published.`,
    type: "success" as const,
  }),

  paRemarksAvailable: (applicationNumber: string) => ({
    title: "Patent Attorney Remarks Available",
    message: `The Patent Attorney has added remarks to your application ${applicationNumber}. Please review them.`,
    type: "info" as const,
  }),
}

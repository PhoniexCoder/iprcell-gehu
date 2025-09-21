import { createUploadthing, type FileRouter } from "uploadthing/next"

const f = createUploadthing()

export const fileRouter = {
  // Accept generic files (we validate types client-side)
  docsUploader: f({ blob: { maxFileSize: "16MB", maxFileCount: 10 } }).onUploadComplete(async ({ file }: any) => {
    // You can store file metadata in Firestore here if needed
    console.log("UploadThing: file uploaded:", file.url)
  }),
} satisfies FileRouter

export type OurFileRouter = typeof fileRouter

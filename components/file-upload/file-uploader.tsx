"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { uploadFiles } from "@/lib/uploadthing"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import type { FileAttachment } from "@/lib/types"
import { Upload, X, FileText, ImageIcon, File, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFilesUploaded: (files: FileAttachment[]) => void
  maxFiles?: number
  maxSizePerFile?: number // in MB
  acceptedTypes?: string[]
  existingFiles?: FileAttachment[]
}

const defaultAcceptedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
]

export function FileUploader({
  onFilesUploaded,
  maxFiles = 10,
  maxSizePerFile = 10,
  acceptedTypes = defaultAcceptedTypes,
  existingFiles = [],
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<
    Array<{
      file: File
      progress: number
      error?: string
      uploaded?: boolean
      downloadURL?: string
    }>
  >([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`
    }
    if (file.size > maxSizePerFile * 1024 * 1024) {
      return `File size exceeds ${maxSizePerFile}MB limit`
    }
    return null
  }

  const uploadFile = async (file: File, index: number) => {
    try {
      // UploadThing handles uploads per-file; we send as single-element array
      const res = await uploadFiles("docsUploader", { files: [file] })
      const url = res?.[0]?.url as string | undefined
      if (!url) throw new Error("Upload failed: no URL returned")
      setUploadingFiles((prev) => prev.map((item, i) => (i === index ? { ...item, progress: 100, uploaded: true, downloadURL: url } : item)))
      return url
    } catch (err: any) {
      setUploadingFiles((prev) => prev.map((item, i) => (i === index ? { ...item, error: err.message || "Upload failed" } : item)))
      throw err
    }
  }

  const handleFiles = useCallback(
    async (files: FileList) => {
      setError("")
      const fileArray = Array.from(files)

      // Check total file limit
      if (existingFiles.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Validate each file
      const validFiles: File[] = []
      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          return
        }
        validFiles.push(file)
      }

      // Initialize upload state
      const initialUploadState = validFiles.map((file) => ({
        file,
        progress: 0,
        uploaded: false,
      }))
      setUploadingFiles(initialUploadState)

  // Upload files (UploadThing does not stream progress per-byte; we set 100% on completion)
      const uploadedFiles: FileAttachment[] = []
      for (let i = 0; i < validFiles.length; i++) {
        try {
          const downloadURL = await uploadFile(validFiles[i], i)
          const fileAttachment: FileAttachment = {
            id: `${Date.now()}-${i}`,
            name: validFiles[i].name,
            url: downloadURL,
            size: validFiles[i].size,
            type: validFiles[i].type,
            uploadedAt: new Date(),
          }
          uploadedFiles.push(fileAttachment)
        } catch (error) {
          console.error("Upload failed:", error)
        }
      }

      if (uploadedFiles.length > 0) {
        onFilesUploaded([...existingFiles, ...uploadedFiles])
      }

      // Clear upload state after a delay
      setTimeout(() => {
        setUploadingFiles([])
      }, 2000)
    },
    [existingFiles, maxFiles, maxSizePerFile, acceptedTypes, onFilesUploaded],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (fileId: string) => {
    const updatedFiles = existingFiles.filter((file) => file.id !== fileId)
    onFilesUploaded(updatedFiles)
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (type === "application/pdf") return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent
          className="flex flex-col items-center justify-center py-8"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
        >
          <Upload className="h-8 w-8 text-gray-400 mb-4" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drop files here or{" "}
              <button
                type="button"
                className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes.join(",")}
                onChange={handleInputChange}
                className="sr-only"
              />
            </p>
            <p className="text-xs text-gray-500">
              Supported: DOCX only.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          {uploadingFiles.map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getFileIcon(item.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={item.progress} className="flex-1 h-2" />
                  <span className="text-xs text-gray-500">{Math.round(item.progress)}%</span>
                </div>
                {item.error && <p className="text-xs text-red-600 mt-1">{item.error}</p>}
              </div>
              {item.uploaded && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
          ))}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({existingFiles.length})</h4>
          <div className="space-y-2">
            {existingFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString?.() || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(file.url, "_blank")}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

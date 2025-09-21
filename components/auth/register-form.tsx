"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { User } from "@/lib/types"

interface RegisterFormProps {
  onToggleMode: () => void
}

const departments = [
  "Computer Science & Engineering",
  "Electronics & Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Management Studies",
  "Applied Sciences",
  "Other",
]

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    department: "",
    employeeId: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate email domain if configured
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN
    if (allowedDomain && !formData.email.endsWith(`@${allowedDomain}`)) {
      setError(`Please use your ${allowedDomain} email address (@${allowedDomain})`)
      setLoading(false)
      return
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      // Create Firebase user
  const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: formData.displayName,
      })

      const userData: User = {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: "user",
        department: formData.department,
        employeeId: formData.employeeId,
        createdAt: new Date(),
        isApproved: true,
      }

      await setDoc(doc(db, "users", userCredential.user.uid), userData)

      // Flag to show message on login page after registration
      if (typeof window !== "undefined") {
        localStorage.setItem("postRegister", "1")
      }

      // Sign out the newly created user and switch to Login form
      await signOut(auth)
      onToggleMode()
    } catch (error: any) {
      setError(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="backdrop-blur-lg bg-white/15 supports-[backdrop-filter]:bg-white/10 border border-white/20 shadow-xl animate-in slide-in-from-bottom-4 duration-700">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <span className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-white/20"></span>
              <Image src="/gehu.png" alt="GEHU Logo" width={80} height={80} className="relative h-20 w-20 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-white">Create Account</CardTitle>
          <CardDescription className="text-center text-gray-200">Join the IPR Cell Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="animate-in slide-in-from-top-2">
                <AlertDescription>
                  Account created! Your account requires admin approval before you can sign in. You may close this
                  window now.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium text-gray-200">
                Full Name
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your full name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">
                University Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@gehu.ac.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-sm font-medium text-gray-200">
                Employee/Student ID
              </Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="Enter your ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium text-gray-200">
                Department
              </Label>
              <Select onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loading || success}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <div className="text-center text-sm text-gray-200">
            Already have an account?{" "}
            <button
              onClick={onToggleMode}
              className="text-blue-300 hover:text-blue-200 font-medium transition-colors duration-200 hover:underline"
            >
              Sign in here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

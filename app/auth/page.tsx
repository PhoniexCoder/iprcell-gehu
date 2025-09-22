"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      const target =
        user.role === "admin" ? "/admin" : user.role === "patent_attorney" ? "/attorney" : "/dashboard"
      router.push(target)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // No approval gating anymore

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 relative overflow-hidden bg-black">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
        poster="/placeholder.jpg"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Subtle overlays for readability (heavier on mobile, same on desktop) */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 sm:from-black/40 sm:via-black/30 sm:to-black/40" />

      <div className="relative z-10 w-full max-w-md px-1 sm:px-0 py-8 sm:py-0">
        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleMode={() => setIsLogin(true)} />
        )}
      </div>

      {/* Hide footer text on very small screens; unchanged on desktop */}
      <div className="hidden sm:block absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-white/90 text-sm font-medium">Graphic Era Hill University</p>
        <p className="text-white/80 text-xs">Intellectual Property Rights Cell</p>
      </div>
    </div>
  )
}

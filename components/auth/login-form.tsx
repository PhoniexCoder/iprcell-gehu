import React, { useEffect, useState } from "react"
import Image from "next/image"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"


interface LoginFormProps {
  onToggleMode: () => void
}



export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { setUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")


    try {
      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN
      if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
        setError(`Please use your ${allowedDomain} email address (@${allowedDomain})`)
        setLoading(false)
        return
      }

      // Firebase Auth login
      await signInWithEmailAndPassword(auth, email, password)
  // Do not force navigation here. AuthPage will redirect by role
  // once `useAuth` picks up the authenticated user.
    } catch (error: any) {
      setError(error.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("postRegister")) {
        setInfo("Account created successfully. Please sign in to continue.")
        localStorage.removeItem("postRegister")
      }
    }
  }, [])

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
          <CardTitle className="text-2xl font-bold text-center text-white">IPR Cell Login</CardTitle>
          <CardDescription className="text-center text-gray-200">
            Access the Intellectual Property Rights Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {info && (
              <Alert className="animate-in slide-in-from-top-2">
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@gehu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="text-center text-sm text-gray-200">
            Don't have an account?{" "}
            <button
              onClick={onToggleMode}
              className="text-blue-300 hover:text-blue-200 font-medium transition-colors duration-200 hover:underline"
            >
              Register here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

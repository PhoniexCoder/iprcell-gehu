"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { cn } from "@/lib/utils"
import { FileText, Plus, Bell, User, LogOut, Menu, X, Shield, Users, Settings } from "lucide-react"

const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: FileText },
  { href: "/dashboard/applications", label: "Applications", icon: FileText },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
]

const adminNavItems = [
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/admin/applications", label: "All Applications", icon: FileText },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const attorneyNavItems = [
  { href: "/attorney", label: "Attorney Dashboard", icon: Shield },
  { href: "/attorney/applications", label: "Review Applications", icon: FileText },
  { href: "/attorney/notifications", label: "Notifications", icon: Bell },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const getNavItems = () => {
  if (user?.role === "admin") return adminNavItems
  if (user?.role === "patent_attorney") return attorneyNavItems
  return userNavItems
  }

  const navItems = getNavItems()
  // Disclosure format download links
  const disclosureFormats = [
    {
      href: "/Invention Disclosure format.docx",
      label: "Download Invention Disclosure Format",
      icon: FileText,
    },
    {
      href: "/DESIGN DISCLOSURE FORMAT.docx",
      label: "Download Design Disclosure Format",
      icon: FileText,
    },
  ]

  return (
    <>
      {/* Mobile menu button */}
  <div className="relative mt-4 ml-4 lg:hidden flex flex-col items-start space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <NotificationBell />
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">IPR Cell</h1>
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{user?.displayName?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {/* Download Disclosure Formats */}
            {disclosureFormats.map((format) => (
              <a
                key={format.href}
                href={format.href}
                download
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                style={{ marginBottom: '0.5rem' }}
              >
                <FileText className="h-5 w-5" />
                <span>{format.label}</span>
              </a>
            ))}
            {/* ...existing code... */}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-gray-900" onClick={logout}>
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Search, Mail, Building, Hash } from "lucide-react"

const roleColors = {
  user: "bg-blue-100 text-blue-800",
  admin: "bg-purple-100 text-purple-800",
  patent_attorney: "bg-green-100 text-green-800",
}

const roleLabels = {
  user: "User",
  admin: "Admin",
  patent_attorney: "Patent Attorney",
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as User[]

      setUsers(userList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.department?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => {
        if (statusFilter === "approved") return user.isApproved
        if (statusFilter === "pending") return !user.isApproved
        return true
      })
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const handleApproveUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isApproved: true,
        approvedAt: new Date(),
      })
    } catch (error) {
      console.error("Error approving user:", error)
    }
  }

  const handleRejectUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isApproved: false,
        rejectedAt: new Date(),
      })
    } catch (error) {
      console.error("Error rejecting user:", error)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error updating user role:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
        <CardTitle>User Management</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
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
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching your criteria.</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.uid} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{user.displayName}</h3>
                      <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                      <Badge variant={user.isApproved ? "default" : "secondary"}>
                        {user.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>{user.department}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Hash className="h-3 w-3" />
                        <span>{user.employeeId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <Select value={user.role} onValueChange={(value) => handleRoleChange(user.uid, value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="patent_attorney">Patent Attorney</SelectItem>
                    </SelectContent>
                  </Select>

                  {!user.isApproved && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveUser(user.uid)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}

                  {user.isApproved && (
                    <Button size="sm" variant="outline" onClick={() => handleRejectUser(user.uid)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke Access
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

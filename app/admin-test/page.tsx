"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"

export default function AdminTestPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setUser(null)
        setIsLoading(false)
        return
      }

      setUser(session.user)

      // Check user profile
      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error checking user status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Status Check</h1>
      
      {!user ? (
        <div className="bg-red-100 p-4 rounded-lg">
          <h2 className="text-red-800 font-semibold">Not Logged In</h2>
          <p className="text-red-600">Please log in first</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h2 className="text-blue-800 font-semibold">User Info</h2>
            <p className="text-blue-600">Email: {user.email}</p>
            <p className="text-blue-600">ID: {user.id}</p>
          </div>

          {userProfile ? (
            <div className={`p-4 rounded-lg ${userProfile.isAdmin ? 'bg-green-100' : 'bg-red-100'}`}>
              <h2 className={`font-semibold ${userProfile.isAdmin ? 'text-green-800' : 'text-red-800'}`}>
                Admin Status: {userProfile.isAdmin ? 'ADMIN' : 'NOT ADMIN'}
              </h2>
              <p className={userProfile.isAdmin ? 'text-green-600' : 'text-red-600'}>
                Role: {userProfile.isAdmin ? 'admin' : 'user'}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-100 p-4 rounded-lg">
              <h2 className="text-yellow-800 font-semibold">Profile Check Failed</h2>
              <p className="text-yellow-600">Could not verify admin status</p>
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-gray-800 font-semibold">Next Steps</h2>
            <ul className="text-gray-600 space-y-1">
              <li>• If you're not admin, run: UPDATE public.user_profiles SET role = 'admin' WHERE email = '{user.email}';</li>
              <li>• Refresh this page after updating the database</li>
              <li>• Once admin, try accessing /admin/api-keys</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

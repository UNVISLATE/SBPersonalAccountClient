import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (!isLoading && user) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}

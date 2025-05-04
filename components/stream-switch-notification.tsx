"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreamSwitchNotificationProps {
  isBackup: boolean
  channelName: string
  show: boolean
  onHide?: () => void
}

export function StreamSwitchNotification({ isBackup, channelName, show, onHide }: StreamSwitchNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [animationClass, setAnimationClass] = useState("")

  useEffect(() => {
    if (show) {
      setVisible(true)
      setAnimationClass("animate-in fade-in slide-in-from-top duration-300")

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setAnimationClass("animate-out fade-out slide-out-to-top duration-300")
        setTimeout(() => {
          setVisible(false)
          if (onHide) onHide()
        }, 300)
      }, 5000)

      return () => clearTimeout(timer)
    } else {
      setAnimationClass("animate-out fade-out slide-out-to-top duration-300")
      const timer = setTimeout(() => {
        setVisible(false)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-lg shadow-lg p-4 flex items-center gap-3",
        isBackup ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800",
        animationClass,
      )}
    >
      {isBackup ? (
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      ) : (
        <CheckCircle className="h-5 w-5 text-green-500" />
      )}
      <div>
        <p className="font-medium">{isBackup ? "Switched to backup stream" : "Switched to main stream"}</p>
        <p className="text-sm opacity-90">{channelName}</p>
      </div>
    </div>
  )
}

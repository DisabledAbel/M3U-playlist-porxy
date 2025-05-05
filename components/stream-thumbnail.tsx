"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreamThumbnailProps {
  url: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}

export function StreamThumbnail({ url, className, onLoad, onError }: StreamThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!url || attemptedRef.current) return

    attemptedRef.current = true
    setIsLoading(true)
    setError(false)
    setThumbnailUrl(null)

    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.playsInline = true

    // Set up a timeout to prevent hanging on stream load
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setError(true)
      if (onError) onError()
    }, 10000) // 10 second timeout

    // Handle successful load
    const handleLoadedData = () => {
      try {
        clearTimeout(timeoutId)

        // Try to play the video briefly to get a frame
        video
          .play()
          .then(() => {
            setTimeout(() => {
              try {
                // Create canvas and capture frame
                const canvas = document.createElement("canvas")
                canvas.width = video.videoWidth || 320
                canvas.height = video.videoHeight || 180

                const ctx = canvas.getContext("2d")
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                  // Convert to data URL
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
                  setThumbnailUrl(dataUrl)
                  setIsLoading(false)
                  if (onLoad) onLoad()
                } else {
                  throw new Error("Could not get canvas context")
                }
              } catch (e) {
                console.error("Error capturing thumbnail:", e)
                setError(true)
                setIsLoading(false)
                if (onError) onError()
              } finally {
                video.pause()
                video.src = ""
                video.load()
              }
            }, 500) // Wait a bit to get a frame
          })
          .catch((e) => {
            console.error("Error playing video for thumbnail:", e)
            setError(true)
            setIsLoading(false)
            if (onError) onError()
          })
      } catch (e) {
        console.error("Error in loadeddata handler:", e)
        setError(true)
        setIsLoading(false)
        if (onError) onError()
      }
    }

    // Handle errors
    const handleError = () => {
      clearTimeout(timeoutId)
      console.error("Error loading video for thumbnail")
      setError(true)
      setIsLoading(false)
      if (onError) onError()
    }

    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("error", handleError)

    // Start loading the video
    video.src = url
    video.load()

    return () => {
      clearTimeout(timeoutId)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("error", handleError)
      video.pause()
      video.src = ""
      video.load()
    }
  }, [url, onLoad, onError])

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted rounded-md flex items-center justify-center w-20 h-12",
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {thumbnailUrl && (
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt="Stream preview"
          className="w-full h-full object-cover"
          onError={() => {
            setError(true)
            setThumbnailUrl(null)
            if (onError) onError()
          }}
        />
      )}
    </div>
  )
}

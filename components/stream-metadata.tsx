"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface StreamMetadataProps {
  url: string
  onLoad?: (metadata: StreamMetadataInfo) => void
  onError?: () => void
}

export interface StreamMetadataInfo {
  resolution: string
  duration: number | null
  videoCodec: string | null
  audioCodec: string | null
  bitrate: string | null
  fps: number | null
}

export function StreamMetadata({ url, onLoad, onError }: StreamMetadataProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [metadata, setMetadata] = useState<StreamMetadataInfo | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!url || attemptedRef.current) return

    attemptedRef.current = true
    setIsLoading(true)
    setError(false)
    setMetadata(null)

    // Create a video element to load the stream
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.playsInline = true
    videoRef.current = video

    // Set up a timeout to prevent hanging on stream load
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setError(true)
      if (onError) onError()
    }, 10000) // 10 second timeout

    // Handle successful metadata load
    const handleLoadedMetadata = () => {
      try {
        clearTimeout(timeoutId)

        // Extract basic metadata
        const width = video.videoWidth || 0
        const height = video.videoHeight || 0
        const duration = video.duration !== Number.POSITIVE_INFINITY ? video.duration : null

        // Try to get more detailed metadata if available
        let videoCodec: string | null = null
        let audioCodec: string | null = null
        const bitrate: string | null = null
        let fps: number | null = null

        // Try to extract codec info from MediaSource if available
        try {
          if ("mediaSource" in HTMLVideoElement.prototype) {
            // This is a simplified approach - in reality, codec detection is more complex
            // and would require analyzing the stream more deeply
            videoCodec = "Auto-detected"
            audioCodec = "Auto-detected"
          }
        } catch (e) {
          console.warn("Could not detect codec information:", e)
        }

        // Create metadata object
        const streamMetadata: StreamMetadataInfo = {
          resolution: width && height ? `${width}x${height}` : "Unknown",
          duration,
          videoCodec,
          audioCodec,
          bitrate,
          fps,
        }

        setMetadata(streamMetadata)
        setIsLoading(false)

        if (onLoad) onLoad(streamMetadata)

        // Try to play the video briefly to get more accurate metadata
        video
          .play()
          .then(() => {
            setTimeout(() => {
              // Update FPS if possible
              if ("getVideoPlaybackQuality" in video) {
                try {
                  const quality = (video as any).getVideoPlaybackQuality()
                  if (quality && quality.totalVideoFrames > 0 && video.currentTime > 0) {
                    fps = Math.round(quality.totalVideoFrames / video.currentTime)

                    setMetadata((prev) =>
                      prev
                        ? {
                            ...prev,
                            fps,
                          }
                        : null,
                    )
                  }
                } catch (e) {
                  console.warn("Could not get video playback quality:", e)
                }
              }

              // Stop the video
              video.pause()
              video.src = ""
              video.load()
            }, 1000) // Wait a bit to gather more data
          })
          .catch((e) => {
            console.warn("Could not play video for metadata extraction:", e)
            // Still consider this a success since we got basic metadata
          })
      } catch (e) {
        console.error("Error extracting metadata:", e)
        setError(true)
        setIsLoading(false)
        if (onError) onError()
      }
    }

    // Handle errors
    const handleError = () => {
      clearTimeout(timeoutId)
      console.error("Error loading video for metadata extraction")
      setError(true)
      setIsLoading(false)
      if (onError) onError()
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("error", handleError)

    // Start loading the video
    video.src = url
    video.load()

    return () => {
      clearTimeout(timeoutId)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("error", handleError)
      video.pause()
      video.src = ""
      video.load()
    }
  }, [url, onLoad, onError])

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading metadata...</span>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="text-xs text-muted-foreground">
        <span>Metadata unavailable</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {metadata.resolution !== "Unknown" && (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
          {metadata.resolution}
        </Badge>
      )}

      {metadata.fps && (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
          {metadata.fps} FPS
        </Badge>
      )}

      {metadata.duration && metadata.duration !== Number.POSITIVE_INFINITY && (
        <Badge variant="outline" className="text-xs">
          {formatDuration(metadata.duration)}
        </Badge>
      )}

      {metadata.videoCodec && (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
          {metadata.videoCodec}
        </Badge>
      )}

      {metadata.audioCodec && (
        <Badge variant="outline" className="text-xs">
          {metadata.audioCodec}
        </Badge>
      )}

      {metadata.bitrate && (
        <Badge variant="outline" className="text-xs">
          {metadata.bitrate}
        </Badge>
      )}
    </div>
  )
}

// Helper function to format duration in seconds to MM:SS format
function formatDuration(seconds: number): string {
  if (!seconds || seconds === Number.POSITIVE_INFINITY) return "Live"

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

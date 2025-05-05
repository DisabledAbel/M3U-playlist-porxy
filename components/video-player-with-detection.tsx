"use client"

import { useEffect, useRef, useState } from "react"
import { captureVideoFrame, compareImages, loadImage } from "@/lib/image-comparison"
import { RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { StreamSwitchNotification } from "./stream-switch-notification"
import { StreamHealthMonitor } from "./stream-health-monitor"

interface VideoPlayerWithDetectionProps {
  primaryStreamUrl: string
  backupStreams: { url: string; priority: number }[]
  imageDetection: {
    enabled: boolean
    referenceImageUrl?: string
    similarityThreshold: number
    checkInterval: number
  }
  channelName: string
}

export function VideoPlayerWithDetection({
  primaryStreamUrl,
  backupStreams,
  imageDetection,
  channelName,
}: VideoPlayerWithDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentStreamUrl, setCurrentStreamUrl] = useState(primaryStreamUrl)
  const [currentStreamIndex, setCurrentStreamIndex] = useState(-1) // -1 means primary stream
  const [detectionActive, setDetectionActive] = useState(false)
  const [lastSwitchTime, setLastSwitchTime] = useState(0)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const referenceImageRef = useRef<HTMLImageElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const maxErrorCount = 3 // Maximum number of errors before switching streams
  const [isUsingBackup, setIsUsingBackup] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [showHealthMonitor, setShowHealthMonitor] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Load reference image when URL changes
  useEffect(() => {
    if (imageDetection.enabled && imageDetection.referenceImageUrl) {
      loadImage(imageDetection.referenceImageUrl)
        .then((img) => {
          referenceImageRef.current = img
          console.log("Reference image loaded successfully")
        })
        .catch((error) => {
          console.error("Failed to load reference image:", error)
          referenceImageRef.current = null
        })
    } else {
      referenceImageRef.current = null
    }
  }, [imageDetection.enabled, imageDetection.referenceImageUrl])

  // Set up image detection
  useEffect(() => {
    if (!imageDetection.enabled || !imageDetection.referenceImageUrl || !videoRef.current) {
      // Clean up any existing interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      setDetectionActive(false)
      return
    }

    // Start detection after video has loaded metadata
    const video = videoRef.current
    const handleMetadata = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }

      setDetectionActive(true)
      detectionIntervalRef.current = setInterval(checkForStaticImage, imageDetection.checkInterval * 1000)
    }

    video.addEventListener("loadedmetadata", handleMetadata)

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata)
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      setDetectionActive(false)
    }
  }, [imageDetection, videoRef.current])

  // Check for static image and switch to backup if needed
  const checkForStaticImage = async () => {
    if (!videoRef.current || !referenceImageRef.current || !videoRef.current.videoWidth) {
      return
    }

    try {
      // Capture current frame
      const currentFrame = await captureVideoFrame(videoRef.current)

      // Compare with reference image
      const similarity = await compareImages(currentFrame, referenceImageRef.current)
      console.log(`Image similarity: ${similarity.toFixed(2)}%`)

      // If similarity is above threshold and we're on the primary stream, switch to backup
      if (similarity >= imageDetection.similarityThreshold && currentStreamIndex === -1) {
        console.log("Static image detected, switching to backup stream")
        switchToNextStream()
      }

      // If similarity is below threshold and we're on a backup stream, consider switching back to primary
      // Only switch back after a cooldown period (30 seconds)
      const now = Date.now()
      if (
        similarity < imageDetection.similarityThreshold &&
        currentStreamIndex !== -1 &&
        now - lastSwitchTime > 30000
      ) {
        console.log("Primary stream appears to be working again, switching back")
        switchToPrimaryStream()
      }
    } catch (error) {
      console.error("Error during image detection:", error)
    }
  }

  // Handle video errors
  const handleVideoError = () => {
    console.error("Video error occurred")

    // Increment error count
    setErrorCount((prev) => prev + 1)

    // If we've reached the maximum error count, switch streams
    if (errorCount >= maxErrorCount) {
      console.log(`Maximum error count (${maxErrorCount}) reached, switching streams`)
      setErrorCount(0) // Reset error count
      switchToNextStream()
    } else {
      console.log(`Error count: ${errorCount + 1}/${maxErrorCount}`)

      // Try to reload the current stream first
      if (videoRef.current) {
        console.log("Attempting to reload current stream")
        videoRef.current.load()
      }
    }
  }

  // Switch to the next available stream
  const switchToNextStream = () => {
    setIsLoading(true)

    // Make sure we have backup streams to switch to
    if (!backupStreams || backupStreams.length === 0) {
      console.log("No backup streams available")
      setIsLoading(false)
      return
    }

    const sortedBackups = [...backupStreams].sort((a, b) => a.priority - b.priority)

    // If we're already on a backup stream, try the next one
    const nextIndex = currentStreamIndex + 1

    if (nextIndex < sortedBackups.length) {
      // Switch to next backup
      console.log(`Switching to backup stream ${nextIndex + 1}: ${sortedBackups[nextIndex].url}`)
      setCurrentStreamUrl(sortedBackups[nextIndex].url)
      setCurrentStreamIndex(nextIndex)
      setIsUsingBackup(true)
      setShowNotification(true)
    } else if (sortedBackups.length > 0 && currentStreamIndex === -1) {
      // Switch to first backup if we're on primary
      console.log(`Switching to first backup stream: ${sortedBackups[0].url}`)
      setCurrentStreamUrl(sortedBackups[0].url)
      setCurrentStreamIndex(0)
      setIsUsingBackup(true)
      setShowNotification(true)
    } else {
      // No more backups to try, stay on current stream
      console.log("No more backup streams available")
      setIsLoading(false)
    }

    setLastSwitchTime(Date.now())
  }

  // Switch back to primary stream
  const switchToPrimaryStream = () => {
    setIsLoading(true)
    console.log(`Switching back to primary stream: ${primaryStreamUrl}`)
    setCurrentStreamUrl(primaryStreamUrl)
    setCurrentStreamIndex(-1)
    setLastSwitchTime(Date.now())
    setIsUsingBackup(false)
    setShowNotification(true)
  }

  // Handle video loaded data event
  const handleLoadedData = () => {
    setIsLoading(false)
    setErrorCount(0) // Reset error count when stream loads successfully
    setIsPlaying(true)
    console.log(`Stream loaded successfully: ${currentStreamUrl}`)
  }

  // Function to switch to backup stream manually
  const switchToBackupStreamManual = (index: number) => {
    if (index >= 0 && index < backupStreams.length && currentStreamIndex !== index) {
      console.log(`Manually switching to backup stream ${index + 1}: ${backupStreams[index].url}`)
      setCurrentStreamIndex(index)
      setIsUsingBackup(true)
      setShowNotification(true)
      setCurrentStreamUrl(backupStreams[index].url)
      setLastSwitchTime(Date.now())
    }
  }

  // Function to switch back to main stream manually
  const switchToPrimaryStreamManual = () => {
    if (currentStreamIndex !== -1) {
      console.log(`Manually switching back to primary stream: ${primaryStreamUrl}`)
      setCurrentStreamIndex(-1)
      setIsUsingBackup(false)
      setShowNotification(true)
      setCurrentStreamUrl(primaryStreamUrl)
      setLastSwitchTime(Date.now())
    }
  }

  // Handle video pause event
  const handlePause = () => {
    setIsPlaying(false)
  }

  // Handle video play event
  const handlePlay = () => {
    setIsPlaying(true)
  }

  // Toggle health monitor
  const toggleHealthMonitor = () => {
    setShowHealthMonitor(!showHealthMonitor)
  }

  return (
    <div className="relative">
      {/* Video player */}
      <video
        ref={videoRef}
        src={currentStreamUrl}
        controls
        autoPlay
        className={cn("w-full rounded-lg transition-opacity duration-500", isLoading ? "opacity-50" : "opacity-100")}
        onError={handleVideoError}
        onLoadedData={handleLoadedData}
        onPause={handlePause}
        onPlay={handlePlay}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-white">
            <RefreshCcw className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex gap-2">
        {detectionActive && (
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <span className="h-2 w-2 bg-white rounded-full"></span>
            <span>Detection Active</span>
          </div>
        )}
        {currentStreamIndex !== -1 && (
          <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            Backup Stream {currentStreamIndex + 1}
          </div>
        )}
      </div>

      {/* Manual stream control buttons */}
      <div className="absolute bottom-16 right-2 flex flex-col gap-2">
        <button
          onClick={toggleHealthMonitor}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full transition-colors"
        >
          {showHealthMonitor ? "Hide Health Monitor" : "Show Health Monitor"}
        </button>

        {currentStreamIndex !== -1 && (
          <button
            onClick={switchToPrimaryStreamManual}
            className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-full transition-colors"
          >
            Switch to Primary
          </button>
        )}
        {currentStreamIndex === -1 && backupStreams.length > 0 && (
          <button
            onClick={() => switchToBackupStreamManual(0)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded-full transition-colors"
          >
            Try Backup
          </button>
        )}
      </div>

      {/* Stream switch notification */}
      <StreamSwitchNotification
        isBackup={isUsingBackup}
        channelName={channelName}
        show={showNotification}
        onHide={() => setShowNotification(false)}
      />

      {/* Stream health monitor */}
      {showHealthMonitor && (
        <StreamHealthMonitor videoRef={videoRef} streamUrl={currentStreamUrl} isPlaying={isPlaying} />
      )}
    </div>
  )
}

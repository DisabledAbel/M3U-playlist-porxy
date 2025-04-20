"use client"

import { useEffect, useRef, useState } from "react"
import { captureVideoFrame, compareImages, loadImage } from "@/lib/image-comparison"

interface VideoPlayerWithDetectionProps {
  primaryStreamUrl: string
  backupStreams: { url: string; priority: number }[]
  imageDetection: {
    enabled: boolean
    referenceImageUrl?: string
    similarityThreshold: number
    checkInterval: number
  }
}

export function VideoPlayerWithDetection({
  primaryStreamUrl,
  backupStreams,
  imageDetection,
}: VideoPlayerWithDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentStreamUrl, setCurrentStreamUrl] = useState(primaryStreamUrl)
  const [currentStreamIndex, setCurrentStreamIndex] = useState(-1) // -1 means primary stream
  const [detectionActive, setDetectionActive] = useState(false)
  const [lastSwitchTime, setLastSwitchTime] = useState(0)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const referenceImageRef = useRef<HTMLImageElement | null>(null)

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

  // Switch to the next available stream
  const switchToNextStream = () => {
    const sortedBackups = [...backupStreams].sort((a, b) => a.priority - b.priority)

    // If we're already on a backup stream, try the next one
    const nextIndex = currentStreamIndex + 1

    if (nextIndex < sortedBackups.length) {
      // Switch to next backup
      setCurrentStreamUrl(sortedBackups[nextIndex].url)
      setCurrentStreamIndex(nextIndex)
    } else if (sortedBackups.length > 0 && currentStreamIndex === -1) {
      // Switch to first backup if we're on primary
      setCurrentStreamUrl(sortedBackups[0].url)
      setCurrentStreamIndex(0)
    }

    setLastSwitchTime(Date.now())
  }

  // Switch back to primary stream
  const switchToPrimaryStream = () => {
    setCurrentStreamUrl(primaryStreamUrl)
    setCurrentStreamIndex(-1)
    setLastSwitchTime(Date.now())
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={currentStreamUrl}
        controls
        autoPlay
        className="w-full rounded-lg"
        onError={switchToNextStream}
      />
      {detectionActive && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          Image Detection Active
        </div>
      )}
      {currentStreamIndex !== -1 && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
          Using Backup Stream {currentStreamIndex + 1}
        </div>
      )}
    </div>
  )
}

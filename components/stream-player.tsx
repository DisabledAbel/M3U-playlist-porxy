"use client"

import { useState } from "react"
import { VideoPlayerWithDetection } from "./video-player-with-detection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatStreamUrl } from "@/lib/stream-utils"

interface StreamPlayerProps {
  channelName: string
  primaryStreamUrl: string
  backupStreams: { url: string; priority: number }[]
  imageDetection?: {
    enabled: boolean
    referenceImageUrl?: string
    similarityThreshold: number
    checkInterval: number
  }
}

export function StreamPlayer({
  channelName,
  primaryStreamUrl,
  backupStreams,
  imageDetection = { enabled: false, similarityThreshold: 85, checkInterval: 10 },
}: StreamPlayerProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{channelName}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Show Details"}
          </Button>
        </div>
        <CardDescription>
          {showDetails ? (
            <div className="text-xs mt-2">
              <p>Primary: {formatStreamUrl(primaryStreamUrl)}</p>
              <p>Backups: {backupStreams.length}</p>
              <p>Image Detection: {imageDetection.enabled ? "Enabled" : "Disabled"}</p>
            </div>
          ) : (
            `${backupStreams.length} backup streams available`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VideoPlayerWithDetection
          primaryStreamUrl={primaryStreamUrl}
          backupStreams={backupStreams}
          imageDetection={imageDetection}
          channelName={channelName}
        />
      </CardContent>
    </Card>
  )
}

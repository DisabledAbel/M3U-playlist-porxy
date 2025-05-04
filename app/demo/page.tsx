"use client"

import { useState } from "react"
import { StreamPlayer } from "@/components/stream-player"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DemoPage() {
  const [primaryUrl, setPrimaryUrl] = useState("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8")
  const [backupUrl1, setBackupUrl1] = useState("https://test-streams.mux.dev/test_001/stream.m3u8")
  const [backupUrl2, setBackupUrl2] = useState("https://test-streams.mux.dev/low-latency/x36xhzz/mux.m3u8")
  const [referenceImageUrl, setReferenceImageUrl] = useState(
    "https://via.placeholder.com/640x360.png?text=Stream+Offline",
  )
  const [imageDetectionEnabled, setImageDetectionEnabled] = useState(true)

  const backupStreams = [
    { url: backupUrl1, priority: 1 },
    { url: backupUrl2, priority: 2 },
  ].filter((stream) => stream.url.trim() !== "")

  const imageDetection = {
    enabled: imageDetectionEnabled,
    referenceImageUrl: referenceImageUrl,
    similarityThreshold: 85,
    checkInterval: 10,
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Stream Switching Demo</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Stream Settings</CardTitle>
              <CardDescription>Configure the primary and backup streams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-url">Primary Stream URL</Label>
                <Input
                  id="primary-url"
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-url-1">Backup Stream 1</Label>
                <Input
                  id="backup-url-1"
                  value={backupUrl1}
                  onChange={(e) => setBackupUrl1(e.target.value)}
                  placeholder="https://example.com/backup1.m3u8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-url-2">Backup Stream 2</Label>
                <Input
                  id="backup-url-2"
                  value={backupUrl2}
                  onChange={(e) => setBackupUrl2(e.target.value)}
                  placeholder="https://example.com/backup2.m3u8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-image">Reference Image URL (for offline detection)</Label>
                <Input
                  id="reference-image"
                  value={referenceImageUrl}
                  onChange={(e) => setReferenceImageUrl(e.target.value)}
                  placeholder="https://example.com/offline-image.jpg"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="enable-detection"
                  checked={imageDetectionEnabled}
                  onChange={(e) => setImageDetectionEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="enable-detection">Enable image detection</Label>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground">To test stream switching:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Use the manual buttons on the player</li>
                  <li>Enter an invalid URL to trigger an error</li>
                  <li>Use an offline image URL that matches your stream when it's offline</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <StreamPlayer
            channelName="Demo Channel"
            primaryStreamUrl={primaryUrl}
            backupStreams={backupStreams}
            imageDetection={imageDetection}
          />
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Copy, ExternalLink, Save, AlertTriangle, Info, Bug, Tv2, Shield, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackupStreamManager, type BackupStream } from "@/components/backup-stream-manager"

interface Group {
  id: string
  originalName: string
  newName: string
}

interface Channel {
  id: string
  name: string
  extinf: string
  url: string
  group?: string
  tvgId?: string
  logo?: string
}

interface ImageDetectionConfig {
  enabled: boolean
  referenceImageUrl?: string
  similarityThreshold: number
  checkInterval: number
}

// Map to store channel ID mappings
const channelIdMap = new Map<string, string>()

// Extremely simple channel ID function that just uses sequential numbers
// This ensures maximum compatibility and avoids any pattern matching issues
const getChannelId = (originalId: string): string => {
  try {
    // Check if we already have a mapping for this channel
    if (channelIdMap.has(originalId)) {
      return channelIdMap.get(originalId)!
    }

    // Create a new sequential ID
    const newId = `channel${channelIdMap.size + 1}`

    // Store the mapping
    channelIdMap.set(originalId, newId)

    console.log(`Created channel ID mapping: "${originalId}" -> "${newId}"`)
    return newId
  } catch (error) {
    console.error("Error creating channel ID:", error)
    // Fallback to a timestamp-based ID
    const fallbackId = `channel${Date.now()}`
    return fallbackId
  }
}

export default function Home() {
  const [url, setUrl] = useState("")
  const [proxyUrl, setProxyUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useDirectStream, setUseDirectStream] = useState(false)
  const [useTranscode, setUseTranscode] = useState(false)
  const [transcodeFormat, setTranscodeFormat] = useState("hls")
  const [transcodeResolution, setTranscodeResolution] = useState("720")
  const [transcodeBitrate, setTranscodeBitrate] = useState("1500k")
  const [debugMode, setDebugMode] = useState(false)
  const [advancedOptions, setAdvancedOptions] = useState(false)
  const [includeBackups, setIncludeBackups] = useState(true)
  const [backupDialogOpen, setBackupDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [backupStreams, setBackupStreams] = useState<Record<string, BackupStream[]>>({})
  const [imageDetectionSettings, setImageDetectionSettings] = useState<Record<string, ImageDetectionConfig>>({})
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null)
  const { toast } = useToast()

  // Add a delay function to the component for use in various places
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Function to use the test playlist
  const useTestPlaylist = () => {
    setUrl(`${window.location.origin}/api/test`)
    setTestMode(true)
  }

  // Extremely simplified updateProxyUrl function
  const updateProxyUrl = () => {
    if (!url) return

    const baseUrl = window.location.origin
    const groupsParam =
      groups.length > 0
        ? `&groups=${encodeURIComponent(
            JSON.stringify(
              groups.reduce(
                (acc, group) => {
                  if (group.originalName !== group.newName) {
                    acc[group.originalName] = group.newName
                  }
                  return acc
                },
                {} as Record<string, string>,
              ),
            ),
          )}`
        : ""

    const directParam = useDirectStream ? "&direct=true" : ""
    const debugParam = debugMode ? "&debug=true" : ""
    const backupsParam = includeBackups ? "" : "&backups=false"

    // Add transcode parameters
    const transcodeParam = useTranscode ? "&transcode=true" : ""
    const formatParam = useTranscode ? `&format=${transcodeFormat}` : ""
    const resolutionParam = useTranscode ? `&resolution=${transcodeResolution}` : ""
    const bitrateParam = useTranscode ? `&bitrate=${transcodeBitrate}` : ""

    setProxyUrl(
      `${baseUrl}/api/playlist?url=${encodeURIComponent(url)}${groupsParam}${directParam}${debugParam}${backupsParam}${transcodeParam}${formatParam}${resolutionParam}${bitrateParam}`,
    )
  }

  // Update the handleSubmit function to provide better error messages for rate limiting
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a valid M3U playlist URL",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (!response.ok) {
        // Special handling for rate limiting errors
        if (response.status === 429) {
          throw new Error(
            "The source server is rate limiting requests. Please try again later or use a different playlist URL.",
          )
        }
        throw new Error(data.error || data.message || `Failed with status: ${response.status}`)
      }

      // Set groups from the response
      if (data.groups && Array.isArray(data.groups)) {
        setGroups(
          data.groups.map((group: string) => ({
            id: Math.random().toString(36).substring(2, 9),
            originalName: group,
            newName: group,
          })),
        )
      }

      // Update the proxy URL
      updateProxyUrl()

      // Fetch channel list for backup streams
      fetchChannels()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add this helper function to the component
  const sanitizeImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    try {
      // Basic validation to ensure it's a valid URL
      new URL(url)
      return url
    } catch (e) {
      return null
    }
  }

  // Update the fetchChannels function to include retry logic
  const fetchChannels = async () => {
    if (!url) return

    try {
      setLoading(true)

      // Add retry logic
      const maxRetries = 3
      let retryCount = 0
      let success = false
      let data

      while (retryCount < maxRetries && !success) {
        try {
          if (retryCount > 0) {
            // Add exponential backoff
            const waitTime = Math.pow(2, retryCount) * 1000
            toast({
              title: "Retrying...",
              description: `Attempt ${retryCount + 1} of ${maxRetries}`,
            })
            await delay(waitTime)
          }

          const debugUrl = `${window.location.origin}/api/m3u-debug?url=${encodeURIComponent(url)}`
          const response = await fetch(debugUrl)

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error("Rate limited by the source server. Retrying...")
            }
            throw new Error(`Failed with status: ${response.status}`)
          }

          data = await response.json()
          success = true
        } catch (error) {
          console.error(`Attempt ${retryCount + 1} failed:`, error)
          retryCount++

          if (retryCount >= maxRetries) {
            throw error
          }
        }
      }

      if (data.channels && Array.isArray(data.channels)) {
        // Use the channels directly from the improved endpoint
        const extractedChannels: Channel[] = data.channels
          .map((channel: any) => {
            return {
              id: channel.id,
              name: channel.name || "Unknown Channel",
              extinf: channel.info || "",
              url: channel.url || "",
              group: channel.group || "",
              tvgId: channel.tvgId || "",
              logo: sanitizeImageUrl(channel.logo),
            }
          })
          .filter((channel: Channel) => channel.id && channel.url)

        setChannels(extractedChannels)
        console.log(`Loaded ${extractedChannels.length} channels for backup stream management`)
      } else {
        console.warn("No channels found in playlist")
      }
    } catch (error) {
      console.error("Error fetching channels:", error)
      toast({
        title: "Error",
        description: "Failed to load channels. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update the loadAllBackupStreams function with more robust error handling
  const loadAllBackupStreams = async () => {
    try {
      // For each channel, fetch its backup streams
      const allBackups: Record<string, BackupStream[]> = {}

      // Process channels in batches to avoid too many simultaneous requests
      const batchSize = 5
      for (let i = 0; i < channels.length; i += batchSize) {
        const batch = channels.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (channel) => {
            if (!channel.id) return // Skip channels without IDs

            try {
              // Get a simple channel ID
              const simpleId = getChannelId(channel.id)
              console.log(`Loading backup streams for "${channel.name}" (ID: ${channel.id}), simple ID: ${simpleId}`)

              const response = await fetch(`/api/backup-streams?channelId=${encodeURIComponent(simpleId)}`)

              if (response.ok) {
                const data = await response.json()
                if (data.backupStreams && data.backupStreams.length > 0) {
                  allBackups[channel.id] = data.backupStreams.map((stream: any) => ({
                    id: Math.random().toString(36).substring(2, 9),
                    url: stream.url,
                    priority: stream.priority,
                  }))
                }
              } else {
                console.warn(
                  `Failed to load backup streams for ${channel.name}: ${response.status} ${response.statusText}`,
                )
              }
            } catch (channelError) {
              console.error(`Error loading backup streams for channel ${channel.name}:`, channelError)
              // Continue with other channels even if one fails
            }
          }),
        )
      }

      setBackupStreams(allBackups)
      console.log("Loaded all backup streams:", allBackups)
    } catch (error) {
      console.error("Error loading backup streams:", error)
      toast({
        title: "Warning",
        description: "Some backup streams could not be loaded",
        variant: "destructive",
      })
    }
  }

  // Update the loadImageDetectionSettings function with more robust error handling
  const loadImageDetectionSettings = async () => {
    try {
      // Process channels in batches to avoid too many simultaneous requests
      const batchSize = 5
      const allSettings: Record<string, ImageDetectionConfig> = {}

      for (let i = 0; i < channels.length; i += batchSize) {
        const batch = channels.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (channel) => {
            if (!channel.id) return

            try {
              // Get a simple channel ID
              const simpleId = getChannelId(channel.id)
              console.log(`Loading image detection for "${channel.name}" (ID: ${channel.id}), simple ID: ${simpleId}`)

              const response = await fetch(`/api/image-detection?channelId=${encodeURIComponent(simpleId)}`)

              if (response.ok) {
                const data = await response.json()
                if (data.settings) {
                  allSettings[channel.id] = data.settings
                }
              } else {
                console.warn(
                  `Failed to load image detection settings for ${channel.name}: ${response.status} ${response.statusText}`,
                )
              }
            } catch (error) {
              console.error(`Error loading image detection settings for ${channel.name}:`, error)
              // Continue with other channels even if one fails
            }
          }),
        )
      }

      setImageDetectionSettings(allSettings)
      console.log("Loaded image detection settings:", allSettings)
    } catch (error) {
      console.error("Error loading image detection settings:", error)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(proxyUrl)
    toast({
      title: "Copied!",
      description: "Proxy URL copied to clipboard",
    })
  }

  const updateGroupName = (id: string, newName: string) => {
    setGroups(groups.map((group) => (group.id === id ? { ...group, newName } : group)))
  }

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group)
    setNewGroupName(group.newName)
    setEditDialogOpen(true)
  }

  const saveGroupEdit = () => {
    if (selectedGroup && newGroupName.trim()) {
      updateGroupName(selectedGroup.id, newGroupName.trim())
      setEditDialogOpen(false)
      updateProxyUrl()
      toast({
        title: "Group Updated",
        description: `Group "${selectedGroup.originalName}" renamed to "${newGroupName.trim()}"`,
      })
    }
  }

  // Test the proxy URL directly
  const testProxyUrl = async () => {
    if (!proxyUrl) return

    setLoading(true)
    try {
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`)
      }

      const content = await response.text()

      if (!content.includes("#EXTM3U") && !content.includes("#EXTINF")) {
        throw new Error("Response is not a valid M3U playlist")
      }

      toast({
        title: "Success!",
        description: "The playlist is working correctly",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // View raw playlist for debugging
  const viewRawPlaylist = () => {
    if (!url) return
    const debugUrl = `${window.location.origin}/api/playlist?url=${encodeURIComponent(url)}&debug=true`
    window.open(debugUrl, "_blank")
  }

  const debugPlaylist = async () => {
    if (!url) return

    setLoading(true)
    try {
      const debugUrl = `${window.location.origin}/api/m3u-debug?url=${encodeURIComponent(url)}`
      const response = await fetch(debugUrl)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`)
      }

      console.log("Playlist debug info:", data)

      // Show a toast with basic info
      toast({
        title: "Playlist Debug Info",
        description: `Found ${data.extinfs} channels and ${data.urls} URLs. Check console for details.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
      toast({
        title: "Debug Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add a function to test transcoding
  const testTranscoding = async () => {
    if (!url) return

    setLoading(true)
    try {
      const debugUrl = `${window.location.origin}/api/transcode-debug?url=${encodeURIComponent(url)}`
      const response = await fetch(debugUrl)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`)
      }

      console.log("Transcoding debug info:", data)

      // Store FFmpeg availability in state
      setFfmpegAvailable(data.ffmpegAvailable)

      // Show a toast with basic info
      if (data.ffmpegAvailable) {
        toast({
          title: "Transcoding Available",
          description: "FFmpeg is installed and transcoding should work correctly.",
        })
      } else {
        toast({
          title: "Transcoding Not Available",
          description: "FFmpeg is not installed on the server. Transcoding will not work.",
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
      toast({
        title: "Transcoding Test Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update the saveBackupStreams function with more robust error handling
  const saveBackupStreams = async (streams: BackupStream[]) => {
    if (!selectedChannel) return

    try {
      console.log(`Saving backup streams for channel: ${selectedChannel.name} (ID: ${selectedChannel.id})`)

      // Get a simple channel ID
      const simpleId = getChannelId(selectedChannel.id)
      console.log(`Using simple ID: ${simpleId}`)

      // Save to the server
      const response = await fetch("/api/backup-streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: simpleId,
          originalId: selectedChannel.id, // Store the original ID for reference
          streams: streams.map((s) => ({ url: s.url, priority: s.priority })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save backup streams")
      }

      console.log("Server response:", data)

      // Update local state
      setBackupStreams({
        ...backupStreams,
        [selectedChannel.id]: streams,
      })

      setBackupDialogOpen(false)
      toast({
        title: "Backup Streams Saved",
        description: `${streams.length} backup streams saved for ${selectedChannel.name}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Error saving backup streams:", error)
      toast({
        title: "Error",
        description: `Failed to save backup streams: ${message}`,
        variant: "destructive",
      })
    }
  }

  // Update the saveImageDetectionSettings function with more robust error handling
  const saveImageDetectionSettings = async (channelId: string, settings: ImageDetectionConfig) => {
    if (!channelId) return

    try {
      // Get a simple channel ID
      const simpleId = getChannelId(channelId)
      console.log(`Saving image detection settings for simple ID: ${simpleId}`)

      const response = await fetch("/api/image-detection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: simpleId,
          originalId: channelId, // Store the original ID for reference
          settings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save image detection settings")
      }

      // Update local state
      setImageDetectionSettings({
        ...imageDetectionSettings,
        [channelId]: settings,
      })

      toast({
        title: "Image Detection Settings Saved",
        description: settings.enabled
          ? "Image detection has been enabled for this channel"
          : "Image detection has been disabled for this channel",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Error saving image detection settings:", error)
      toast({
        title: "Error",
        description: `Failed to save image detection settings: ${message}`,
        variant: "destructive",
      })
    }
  }

  const openBackupManager = (channel: Channel) => {
    setSelectedChannel(channel)
    setBackupDialogOpen(true)
  }

  // Update proxy URL when options change
  useEffect(() => {
    if (url) {
      updateProxyUrl()
    }
  }, [
    groups,
    useDirectStream,
    useTranscode,
    transcodeFormat,
    transcodeResolution,
    transcodeBitrate,
    debugMode,
    includeBackups,
  ])

  // Add this effect to adjust default resolution when format changes
  useEffect(() => {
    // Set appropriate default resolution based on format
    if (transcodeFormat === "hls" && Number.parseInt(transcodeResolution) > 1080) {
      setTranscodeResolution("1080") // HLS works better with 1080p or lower
    }
  }, [transcodeFormat])

  useEffect(() => {
    if (channels.length > 0) {
      // Add a small delay to ensure the UI is responsive first
      const timer = setTimeout(() => {
        loadAllBackupStreams()
        loadImageDetectionSettings()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [channels])

  // Check FFmpeg availability when transcoding is enabled
  useEffect(() => {
    if (useTranscode && ffmpegAvailable === null) {
      // Only test once when transcoding is first enabled
      testTranscoding()
    }
  }, [useTranscode])

  return (
    <main className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>M3U Playlist Proxy</CardTitle>
          <CardDescription>
            Enter the URL of an M3U playlist to create a proxied version with group editing and transcoding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                M3U Playlist URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/playlist.m3u"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={useTestPlaylist}>
                  Use Test Playlist
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a direct URL to an M3U playlist or use our test playlist for demonstration
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="advanced-options"
                checked={advancedOptions}
                onCheckedChange={(checked) => setAdvancedOptions(checked === true)}
              />
              <label
                htmlFor="advanced-options"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show advanced options
              </label>
            </div>

            {advancedOptions && (
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="text-sm font-medium">Stream Options</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="direct-stream"
                      checked={useDirectStream}
                      onCheckedChange={(checked) => {
                        setUseDirectStream(checked === true)
                        if (checked) setUseTranscode(false)
                      }}
                    />
                    <label
                      htmlFor="direct-stream"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Use direct stream (redirect)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transcode"
                      checked={useTranscode}
                      onCheckedChange={(checked) => {
                        setUseTranscode(checked === true)
                        if (checked) setUseDirectStream(false)
                      }}
                    />
                    <label
                      htmlFor="transcode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                    >
                      Enable transcoding <Tv2 className="h-3 w-3" />
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-backups"
                    checked={includeBackups}
                    onCheckedChange={(checked) => setIncludeBackups(checked === true)}
                  />
                  <label
                    htmlFor="include-backups"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                  >
                    Include backup streams <Shield className="h-3 w-3" />
                  </label>
                </div>

                {useTranscode && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Select value={transcodeFormat} onValueChange={setTranscodeFormat}>
                        <SelectTrigger id="format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hls">HLS</SelectItem>
                          <SelectItem value="mpegts">MPEG-TS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution</Label>
                      <Select value={transcodeResolution} onValueChange={setTranscodeResolution}>
                        <SelectTrigger id="resolution">
                          <SelectValue placeholder="Select resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="240">240p</SelectItem>
                          <SelectItem value="360">360p</SelectItem>
                          <SelectItem value="480">480p</SelectItem>
                          <SelectItem value="576">576p</SelectItem>
                          <SelectItem value="720">720p</SelectItem>
                          <SelectItem value="1080">1080p</SelectItem>
                          <SelectItem value="1440">1440p (2K)</SelectItem>
                          <SelectItem value="2160">2160p (4K)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bitrate">Bitrate</Label>
                      <Select value={transcodeBitrate} onValueChange={setTranscodeBitrate}>
                        <SelectTrigger id="bitrate">
                          <SelectValue placeholder="Select bitrate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="800k">800k (Low)</SelectItem>
                          <SelectItem value="1500k">1500k (Medium)</SelectItem>
                          <SelectItem value="3000k">3000k (High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {useTranscode && (
                  <div>
                    <Button onClick={testTranscoding} variant="outline" size="sm" className="mt-2">
                      Test Transcoding
                    </Button>
                    {ffmpegAvailable === false && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>FFmpeg Not Available</AlertTitle>
                        <AlertDescription>
                          FFmpeg is not installed on the server. Transcoding will not work.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="debug-mode"
                    checked={debugMode}
                    onCheckedChange={(checked) => setDebugMode(checked === true)}
                  />
                  <label
                    htmlFor="debug-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                  >
                    Debug mode <Bug className="h-3 w-3" />
                  </label>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>
                    <strong>Direct stream:</strong> Redirects to original streams instead of proxying them.
                  </p>
                  <p>
                    <strong>Transcoding:</strong> Converts streams to different formats and qualities (requires FFmpeg
                    on server).
                  </p>
                  <p>
                    <strong>Backup streams:</strong> Includes fallback streams for channels when the primary stream
                    fails.
                  </p>
                  <p>
                    <strong>Debug mode:</strong> Returns the raw playlist content for troubleshooting.
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Create Proxy"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {testMode && !error && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Test Mode</AlertTitle>
              <AlertDescription>
                Using test playlist with sample channels. This is for demonstration purposes only.
              </AlertDescription>
            </Alert>
          )}

          {proxyUrl && (
            <div className="mt-6 space-y-4">
              <Tabs defaultValue="proxy">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="proxy">Proxy URL</TabsTrigger>
                  <TabsTrigger value="groups">Edit Groups</TabsTrigger>
                  <TabsTrigger value="backups">Backup Streams</TabsTrigger>
                </TabsList>

                <TabsContent value="proxy" className="space-y-4">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm break-all mr-2">
                        <span>{proxyUrl}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="icon" variant="outline" onClick={copyToClipboard} title="Copy to clipboard">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => window.open(proxyUrl, "_blank")}
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      <p>Use this URL in your media player to access the proxied playlist.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={viewRawPlaylist} variant="outline" size="sm">
                        <Bug className="h-4 w-4 mr-1" /> View Raw
                      </Button>
                      <Button onClick={debugPlaylist} variant="outline" size="sm">
                        Debug Info
                      </Button>
                      <Button onClick={testProxyUrl} disabled={loading} size="sm">
                        Test Playlist
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="groups">
                  {groups.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Original Group Name</TableHead>
                              <TableHead>New Group Name</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groups.map((group) => (
                              <TableRow key={group.id}>
                                <TableCell>{group.originalName}</TableCell>
                                <TableCell>{group.newName}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(group)}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Edit group names to reorganize channels in your playlist.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No groups found in the playlist.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="backups">
                  {channels.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Channel Name</TableHead>
                              <TableHead>Group</TableHead>
                              <TableHead className="w-[120px]">Backup Streams</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {channels.map((channel) => (
                              <TableRow key={channel.id}>
                                <TableCell>{channel.name}</TableCell>
                                <TableCell>{channel.group || "—"}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{backupStreams[channel.id]?.length || 0}</span>
                                    {imageDetectionSettings[channel.id]?.enabled && (
                                      <div className="ml-1" title="Image detection enabled">
                                        <ImageIcon className="h-3 w-3 text-blue-500" />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" onClick={() => openBackupManager(channel)}>
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Add backup streams for channels that may have interruptions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No channels found in the playlist. Create a proxy first to see channels.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>Change the name of the group "{selectedGroup?.originalName}"</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                New Name
              </Label>
              <Input
                id="new-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGroupEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedChannel && (
        <BackupStreamManager
          channelName={selectedChannel.name}
          channelId={selectedChannel.id}
          backupStreams={backupStreams[selectedChannel.id] || []}
          imageDetection={
            imageDetectionSettings[selectedChannel.id] || {
              enabled: false,
              similarityThreshold: 85,
              checkInterval: 10,
            }
          }
          onSave={saveBackupStreams}
          onSaveImageDetection={(settings) => saveImageDetectionSettings(selectedChannel.id, settings)}
          onCancel={() => setBackupDialogOpen(false)}
          open={backupDialogOpen}
        />
      )}
    </main>
  )
}

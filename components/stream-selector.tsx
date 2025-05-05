"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, Check, Play, Pause, AlertCircle, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StreamThumbnail } from "./stream-thumbnail"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { StreamMetadata, type StreamMetadataInfo } from "./stream-metadata"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Channel {
  id: string
  name: string
  url: string
  group?: string
  tvgId?: string
  logo?: string
  metadata?: StreamMetadataInfo
}

interface StreamSelectorProps {
  channelName: string
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  playlistUrl?: string
}

export function StreamSelector({ channelName, open, onClose, onSelect, playlistUrl }: StreamSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<string, boolean>>({})
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({})
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, boolean>>({})
  const [metadataErrors, setMetadataErrors] = useState<Record<string, boolean>>({})
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [customUrlMetadata, setCustomUrlMetadata] = useState<StreamMetadataInfo | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Load channels from the playlist URL if provided
  useEffect(() => {
    if (open && playlistUrl) {
      loadChannels(playlistUrl)
    }
  }, [open, playlistUrl])

  // Clean up preview when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null)
      setIsPlaying(false)
    }
  }, [open])

  const loadChannels = async (url: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/import-full-playlist?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load channels")
      }

      if (!data.channels || !Array.isArray(data.channels) || data.channels.length === 0) {
        throw new Error("No channels found in the playlist")
      }

      setChannels(
        data.channels
          .filter((channel: any) => channel.url && channel.url.includes("://"))
          .map((channel: any) => ({
            id: channel.id || Math.random().toString(36).substring(2, 9),
            name: channel.name || "Unknown Channel",
            url: channel.url,
            group: channel.group || "",
            tvgId: channel.tvgId || "",
            logo: channel.logo || null,
          })),
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedChannelId) {
      const channel = channels.find((c) => c.id === selectedChannelId)
      if (channel) {
        onSelect(channel.url)
        onClose()
      }
    } else if (customUrl) {
      onSelect(customUrl)
      onClose()
    }
  }

  const togglePreview = (url: string) => {
    if (previewUrl === url) {
      setPreviewUrl(null)
      setIsPlaying(false)
    } else {
      setPreviewUrl(url)
      setIsPlaying(true)
    }
  }

  const handleThumbnailLoad = (channelId: string) => {
    setLoadingThumbnails((prev) => ({
      ...prev,
      [channelId]: false,
    }))
  }

  const handleThumbnailError = (channelId: string) => {
    setThumbnailErrors((prev) => ({
      ...prev,
      [channelId]: true,
    }))
    setLoadingThumbnails((prev) => ({
      ...prev,
      [channelId]: false,
    }))
  }

  const startThumbnailLoad = (channelId: string) => {
    setLoadingThumbnails((prev) => ({
      ...prev,
      [channelId]: true,
    }))
    setThumbnailErrors((prev) => ({
      ...prev,
      [channelId]: false,
    }))
  }

  const handleMetadataLoad = (channelId: string, metadata: StreamMetadataInfo) => {
    setLoadingMetadata((prev) => ({
      ...prev,
      [channelId]: false,
    }))

    // Update the channel with metadata
    setChannels(channels.map((channel) => (channel.id === channelId ? { ...channel, metadata } : channel)))
  }

  const handleMetadataError = (channelId: string) => {
    setMetadataErrors((prev) => ({
      ...prev,
      [channelId]: true,
    }))
    setLoadingMetadata((prev) => ({
      ...prev,
      [channelId]: false,
    }))
  }

  const startMetadataLoad = (channelId: string) => {
    setLoadingMetadata((prev) => ({
      ...prev,
      [channelId]: true,
    }))
    setMetadataErrors((prev) => ({
      ...prev,
      [channelId]: false,
    }))
  }

  const handleCustomUrlMetadataLoad = (metadata: StreamMetadataInfo) => {
    setCustomUrlMetadata(metadata)
  }

  const filteredChannels = channels.filter((channel) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      channel.name.toLowerCase().includes(term) ||
      (channel.group && channel.group.toLowerCase().includes(term)) ||
      (channel.tvgId && channel.tvgId.toLowerCase().includes(term))
    )
  })

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Backup Stream</DialogTitle>
          <DialogDescription>
            Choose a backup stream for "{channelName}" from the list or enter a custom URL
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-1"
            >
              <Info className="h-4 w-4" />
              {showTechnicalDetails ? "Hide Technical Details" : "Show Technical Details"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Channels</TabsTrigger>
            <TabsTrigger value="custom">Custom URL</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels by name, group, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border p-2">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No channels found</div>
                ) : (
                  <div className="space-y-2">
                    {filteredChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className={`flex flex-col p-2 rounded-md cursor-pointer ${
                          selectedChannelId === channel.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedChannelId(channel.id)}
                      >
                        <div className="flex items-center">
                          <div className="mr-3">
                            {!loadingThumbnails[channel.id] && !thumbnailErrors[channel.id] ? (
                              <StreamThumbnail
                                url={channel.url}
                                onLoad={() => handleThumbnailLoad(channel.id)}
                                onError={() => handleThumbnailError(channel.id)}
                              />
                            ) : thumbnailErrors[channel.id] ? (
                              <div className="w-20 h-12 bg-muted rounded-md flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="w-20 h-12 bg-muted rounded-md flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{channel.name}</div>
                            <div className="text-xs opacity-70 flex items-center gap-1 flex-wrap">
                              {channel.group && (
                                <Badge variant="outline" className="text-xs">
                                  {channel.group}
                                </Badge>
                              )}
                              {channel.tvgId && <span className="text-xs">ID: {channel.tvgId}</span>}
                            </div>

                            {showTechnicalDetails && (
                              <div className="mt-1">
                                {!loadingMetadata[channel.id] && !metadataErrors[channel.id] ? (
                                  <StreamMetadata
                                    url={channel.url}
                                    onLoad={(metadata) => handleMetadataLoad(channel.id, metadata)}
                                    onError={() => handleMetadataError(channel.id)}
                                  />
                                ) : metadataErrors[channel.id] ? (
                                  <div className="text-xs text-muted-foreground">Metadata unavailable</div>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Loading metadata...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      togglePreview(channel.url)
                                      if (!loadingThumbnails[channel.id] && !thumbnailErrors[channel.id]) {
                                        startThumbnailLoad(channel.id)
                                      }
                                      if (
                                        showTechnicalDetails &&
                                        !loadingMetadata[channel.id] &&
                                        !metadataErrors[channel.id]
                                      ) {
                                        startMetadataLoad(channel.id)
                                      }
                                    }}
                                  >
                                    {previewUrl === channel.url && isPlaying ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {previewUrl === channel.url && isPlaying ? "Stop preview" : "Preview stream"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {selectedChannelId === channel.id && <Check className="h-4 w-4" />}
                          </div>
                        </div>

                        {channel.metadata && showTechnicalDetails && (
                          <Collapsible className="mt-2">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full flex items-center justify-center gap-1 h-6 text-xs"
                              >
                                <Info className="h-3 w-3" />
                                Stream Details
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="font-medium">Resolution:</div>
                                  <div>{channel.metadata.resolution || "Unknown"}</div>

                                  {channel.metadata.fps && (
                                    <>
                                      <div className="font-medium">Frame Rate:</div>
                                      <div>{channel.metadata.fps} FPS</div>
                                    </>
                                  )}

                                  {channel.metadata.duration &&
                                    channel.metadata.duration !== Number.POSITIVE_INFINITY && (
                                      <>
                                        <div className="font-medium">Duration:</div>
                                        <div>{formatDuration(channel.metadata.duration)}</div>
                                      </>
                                    )}

                                  {channel.metadata.videoCodec && (
                                    <>
                                      <div className="font-medium">Video Codec:</div>
                                      <div>{channel.metadata.videoCodec}</div>
                                    </>
                                  )}

                                  {channel.metadata.audioCodec && (
                                    <>
                                      <div className="font-medium">Audio Codec:</div>
                                      <div>{channel.metadata.audioCodec}</div>
                                    </>
                                  )}

                                  {channel.metadata.bitrate && (
                                    <>
                                      <div className="font-medium">Bitrate:</div>
                                      <div>{channel.metadata.bitrate}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}

            {previewUrl && (
              <div className="mt-4 border rounded-md p-2">
                <div className="text-sm font-medium mb-2">Stream Preview</div>
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    controls
                    autoPlay
                    className="w-full h-full"
                    onError={() => {
                      setIsPlaying(false)
                    }}
                  />
                </div>

                {showTechnicalDetails && selectedChannelId && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <div className="text-sm font-medium mb-1">Technical Details</div>
                    <div className="text-xs">
                      {channels.find((c) => c.id === selectedChannelId)?.metadata ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="font-medium">Resolution:</div>
                          <div>
                            {channels.find((c) => c.id === selectedChannelId)?.metadata?.resolution || "Unknown"}
                          </div>

                          <div className="font-medium">Frame Rate:</div>
                          <div>{channels.find((c) => c.id === selectedChannelId)?.metadata?.fps || "Unknown"} FPS</div>

                          <div className="font-medium">Stream Type:</div>
                          <div>{detectStreamType(previewUrl)}</div>

                          {videoRef.current && (
                            <>
                              <div className="font-medium">Current Quality:</div>
                              <div>
                                {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Loading stream details...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-url">Stream URL</Label>
              <Input
                id="custom-url"
                placeholder="https://example.com/stream.m3u8"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a direct URL to a video stream (HLS, DASH, MP4, etc.)
              </p>
            </div>

            {customUrl && showTechnicalDetails && (
              <div className="mt-2">
                <StreamMetadata url={customUrl} onLoad={handleCustomUrlMetadataLoad} />
              </div>
            )}

            {customUrl && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => togglePreview(customUrl)} className="mb-2">
                  {previewUrl === customUrl && isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" /> Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" /> Preview Stream
                    </>
                  )}
                </Button>

                {previewUrl === customUrl && isPlaying && (
                  <div className="space-y-2">
                    <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                      <video
                        ref={videoRef}
                        src={customUrl}
                        controls
                        autoPlay
                        className="w-full h-full"
                        onError={() => {
                          setIsPlaying(false)
                        }}
                      />
                    </div>

                    {showTechnicalDetails && customUrlMetadata && (
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-sm font-medium mb-1">Technical Details</div>
                        <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="font-medium">Resolution:</div>
                          <div>{customUrlMetadata.resolution || "Unknown"}</div>

                          {customUrlMetadata.fps && (
                            <>
                              <div className="font-medium">Frame Rate:</div>
                              <div>{customUrlMetadata.fps} FPS</div>
                            </>
                          )}

                          <div className="font-medium">Stream Type:</div>
                          <div>{detectStreamType(customUrl)}</div>

                          {videoRef.current && (
                            <>
                              <div className="font-medium">Current Quality:</div>
                              <div>
                                {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedChannelId && !customUrl}>
            Select Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to detect stream type from URL
function detectStreamType(url: string): string {
  const lowercaseUrl = url.toLowerCase()

  if (lowercaseUrl.includes(".m3u8")) {
    return "HLS"
  } else if (lowercaseUrl.includes(".mpd")) {
    return "DASH"
  } else if (lowercaseUrl.includes(".mp4")) {
    return "MP4"
  } else if (lowercaseUrl.includes(".webm")) {
    return "WebM"
  } else if (lowercaseUrl.includes(".ts")) {
    return "MPEG-TS"
  } else if (lowercaseUrl.includes("rtmp://")) {
    return "RTMP"
  } else {
    return "Unknown"
  }
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

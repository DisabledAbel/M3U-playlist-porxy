"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, ImageIcon, ArrowUp, ArrowDown, FileText, Loader2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageDetectionSettings } from "./image-detection-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StreamSelector } from "./stream-selector"

export interface BackupStream {
  id: string
  url: string
  priority: number
}

export interface ImageDetectionConfig {
  enabled: boolean
  referenceImageUrl?: string
  similarityThreshold: number
  checkInterval: number
}

interface BackupStreamManagerProps {
  channelName: string
  channelId: string
  backupStreams: BackupStream[]
  imageDetection: ImageDetectionConfig
  onSave: (backupStreams: BackupStream[]) => void
  onSaveImageDetection: (settings: ImageDetectionConfig) => void
  onCancel: () => void
  open: boolean
}

export function BackupStreamManager({
  channelName,
  channelId,
  backupStreams,
  imageDetection,
  onSave,
  onSaveImageDetection,
  onCancel,
  open,
}: BackupStreamManagerProps) {
  const [streams, setStreams] = useState<BackupStream[]>(backupStreams)
  const [imageDetectionOpen, setImageDetectionOpen] = useState(false)
  const [m3uPlaylistUrl, setM3uPlaylistUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [streamSelectorOpen, setStreamSelectorOpen] = useState(false)
  const [currentStreamIndex, setCurrentStreamIndex] = useState<number | null>(null)

  const addStream = () => {
    const newStream: BackupStream = {
      id: Math.random().toString(36).substring(2, 9),
      url: "",
      priority: streams.length + 1,
    }
    setStreams([...streams, newStream])
  }

  const removeStream = (id: string) => {
    setStreams(streams.filter((stream) => stream.id !== id))
  }

  const updateStreamUrl = (id: string, url: string) => {
    setStreams(streams.map((stream) => (stream.id === id ? { ...stream, url } : stream)))
  }

  const moveStreamUp = (id: string) => {
    const index = streams.findIndex((stream) => stream.id === id)
    if (index <= 0) return

    const newStreams = [...streams]
    const temp = newStreams[index]
    newStreams[index] = newStreams[index - 1]
    newStreams[index - 1] = temp

    setStreams(newStreams)
  }

  const moveStreamDown = (id: string) => {
    const index = streams.findIndex((stream) => stream.id === id)
    if (index >= streams.length - 1) return

    const newStreams = [...streams]
    const temp = newStreams[index]
    newStreams[index] = newStreams[index + 1]
    newStreams[index + 1] = temp

    setStreams(newStreams)
  }

  const openStreamSelector = (index: number | null = null) => {
    setCurrentStreamIndex(index)
    setStreamSelectorOpen(true)
  }

  const handleStreamSelected = (url: string) => {
    if (currentStreamIndex !== null) {
      // Update existing stream
      updateStreamUrl(streams[currentStreamIndex].id, url)
    } else {
      // Add new stream
      const newStream: BackupStream = {
        id: Math.random().toString(36).substring(2, 9),
        url: url,
        priority: streams.length + 1,
      }
      setStreams([...streams, newStream])
    }
    setStreamSelectorOpen(false)
  }

  const handleSave = () => {
    // Filter out empty URLs and validate URLs
    const validStreams = streams.filter((stream) => {
      try {
        // Basic URL validation
        const url = stream.url.trim()
        return url !== "" && url.includes("://")
      } catch (e) {
        return false
      }
    })

    // Re-number priorities
    const updatedStreams = validStreams.map((stream, index) => ({
      ...stream,
      priority: index + 1,
      url: stream.url.trim(), // Ensure URLs are trimmed
    }))

    onSave(updatedStreams)
  }

  const openImageDetection = () => {
    setImageDetectionOpen(true)
  }

  const handleSaveImageDetection = (settings: ImageDetectionConfig) => {
    onSaveImageDetection(settings)
    setImageDetectionOpen(false)
  }

  const importM3uPlaylist = async () => {
    if (!m3uPlaylistUrl.trim()) {
      setImportError("Please enter a valid M3U playlist URL")
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      // First try to import as a simple M3U file with streams
      const response = await fetch(`/api/import-m3u?url=${encodeURIComponent(m3uPlaylistUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to import playlist")
      }

      if (!data.streams || !Array.isArray(data.streams) || data.streams.length === 0) {
        // If no streams found, try importing as a full playlist
        const fullResponse = await fetch(`/api/import-full-playlist?url=${encodeURIComponent(m3uPlaylistUrl)}`)
        const fullData = await fullResponse.json()

        if (!fullResponse.ok) {
          throw new Error(fullData.error || fullData.message || "Failed to import playlist")
        }

        if (!fullData.channels || !Array.isArray(fullData.channels) || fullData.channels.length === 0) {
          throw new Error("No valid streams or channels found in the playlist")
        }

        // Extract URLs from channels
        const importedStreams = fullData.channels
          .filter((channel) => channel.url && channel.url.includes("://"))
          .map((channel, index) => ({
            id: Math.random().toString(36).substring(2, 9),
            url: channel.url,
            priority: streams.length + index + 1,
          }))

        if (importedStreams.length === 0) {
          throw new Error("No valid stream URLs found in the playlist")
        }

        // Add the imported streams to the existing streams
        setStreams([...streams, ...importedStreams])
        setImportSuccess(`Successfully imported ${importedStreams.length} streams from full playlist`)
      } else {
        // Process regular M3U streams
        const startPriority = streams.length + 1
        const importedStreams = data.streams
          .filter((stream) => stream.url && stream.url.includes("://"))
          .map((stream, index) => ({
            id: Math.random().toString(36).substring(2, 9),
            url: stream.url,
            priority: startPriority + index,
          }))

        setStreams([...streams, ...importedStreams])
        setImportSuccess(`Successfully imported ${importedStreams.length} streams`)
      }

      setM3uPlaylistUrl("")
    } catch (error) {
      console.error("Error importing M3U playlist:", error)
      setImportError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsImporting(false)
    }
  }

  const importStreamsByContent = async () => {
    if (!m3uPlaylistUrl.trim()) {
      setImportError("Please enter a valid M3U playlist URL")
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      // Fetch the backup playlist
      const response = await fetch(`/api/import-full-playlist?url=${encodeURIComponent(m3uPlaylistUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to import playlist")
      }

      if (!data.channels || !Array.isArray(data.channels) || data.channels.length === 0) {
        throw new Error("No valid channels found in the playlist")
      }

      // Display the channels for manual selection
      const importedStreams = data.channels
        .filter((channel) => channel.url && channel.url.includes("://"))
        .map((channel, index) => ({
          id: Math.random().toString(36).substring(2, 9),
          url: channel.url,
          priority: streams.length + index + 1,
          name: channel.name || "Unknown Channel",
          group: channel.group || "Unknown Group",
        }))

      // Add the imported streams to the existing streams
      setStreams([...streams, ...importedStreams])
      setImportSuccess(
        `Successfully imported ${importedStreams.length} streams. You can now manually select which ones to use.`,
      )
      setM3uPlaylistUrl("")
    } catch (error) {
      console.error("Error importing M3U playlist:", error)
      setImportError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Backup Streams</DialogTitle>
            <DialogDescription>
              Add backup streams for "{channelName}". These will be used if the primary stream fails.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="import">Import M3U</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {streams.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No backup streams added yet. Click "Add Stream" to add one.
                </div>
              ) : (
                streams.map((stream, index) => (
                  <div key={stream.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`stream-${stream.id}`} className="text-xs">
                        Backup Stream {index + 1}
                      </Label>
                      <Input
                        id={`stream-${stream.id}`}
                        value={stream.url}
                        onChange={(e) => updateStreamUrl(stream.id, e.target.value)}
                        placeholder="https://backup-stream-url.com/stream.m3u8"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => moveStreamUp(stream.id)} className="h-10 w-10">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStreamDown(stream.id)}
                        className="h-10 w-10"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openStreamSelector(index)}
                        className="h-10 w-10"
                        title="Select stream"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeStream(stream.id)} className="h-10 w-10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="mt-2 flex-1" onClick={addStream}>
                  <Plus className="h-4 w-4 mr-2" /> Add Empty Stream
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 flex-1"
                  onClick={() => openStreamSelector()}
                >
                  <Plus className="h-4 w-4 mr-2" /> Select Stream
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="m3u-url">M3U Playlist URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="m3u-url"
                    value={m3uPlaylistUrl}
                    onChange={(e) => setM3uPlaylistUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u"
                    className="flex-1"
                  />
                  <Button onClick={importStreamsByContent} disabled={isImporting || !m3uPlaylistUrl.trim()}>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Import for Manual Selection
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Import streams from an M3U playlist to use as backups</p>
              </div>

              {importError && (
                <Alert variant="destructive">
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              {importSuccess && (
                <Alert>
                  <AlertDescription>{importSuccess}</AlertDescription>
                </Alert>
              )}

              {streams.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Current Backup Streams ({streams.length})</Label>
                  <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                    {streams.map((stream, index) => (
                      <div
                        key={stream.id}
                        className="flex justify-between items-center py-1 text-sm border-b last:border-b-0"
                      >
                        <div className="truncate flex-1">{stream.url}</div>
                        <Button variant="ghost" size="sm" onClick={() => removeStream(stream.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 mt-4">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={openImageDetection}>
              <ImageIcon className="h-4 w-4 mr-2" />
              {imageDetection.enabled ? "Edit Image Detection Settings" : "Set Up Image Detection"}
            </Button>
            {imageDetection.enabled && (
              <div className="mt-2 text-xs text-muted-foreground">
                Image detection is enabled. Backup streams will automatically activate when the reference image is
                detected.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageDetectionSettings
        channelName={channelName}
        settings={imageDetection}
        onSave={handleSaveImageDetection}
        onCancel={() => setImageDetectionOpen(false)}
        open={imageDetectionOpen}
      />
      <StreamSelector
        channelName={channelName}
        open={streamSelectorOpen}
        onClose={() => setStreamSelectorOpen(false)}
        onSelect={handleStreamSelected}
        playlistUrl={m3uPlaylistUrl}
      />
    </>
  )
}

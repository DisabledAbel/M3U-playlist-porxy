"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, ImageIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageDetectionSettings } from "./image-detection-settings"

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

  const handleSave = () => {
    // Filter out empty URLs
    const validStreams = streams.filter((stream) => stream.url.trim() !== "")
    // Re-number priorities
    const updatedStreams = validStreams.map((stream, index) => ({
      ...stream,
      priority: index + 1,
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

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Backup Streams</DialogTitle>
            <DialogDescription>
              Add backup streams for "{channelName}". These will be used if the primary stream fails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
                  <Button variant="ghost" size="icon" onClick={() => removeStream(stream.id)} className="h-10 w-10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={addStream}>
              <Plus className="h-4 w-4 mr-2" /> Add Stream
            </Button>

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
    </>
  )
}

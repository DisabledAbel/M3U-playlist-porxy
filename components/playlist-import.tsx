"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface PlaylistImportProps {
  onImport: (channels: any[], importMode: "merge" | "replace") => void
}

export function PlaylistImport({ onImport }: PlaylistImportProps) {
  const [open, setOpen] = useState(false)
  const [m3uPlaylistUrl, setM3uPlaylistUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
  const [importStats, setImportStats] = useState<{ channels: number; groups: number } | null>(null)

  const importM3uPlaylist = async () => {
    if (!m3uPlaylistUrl.trim()) {
      setImportError("Please enter a valid M3U playlist URL")
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportStats(null)

    try {
      const response = await fetch(`/api/import-full-playlist?url=${encodeURIComponent(m3uPlaylistUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to import playlist")
      }

      if (!data.channels || !Array.isArray(data.channels) || data.channels.length === 0) {
        throw new Error("No valid channels found in the playlist")
      }

      // Show import stats before closing
      setImportStats({
        channels: data.channels.length,
        groups: (data.groups || []).length,
      })

      // Pass the imported channels to the parent component
      onImport(data.channels, importMode)

      // Don't close the dialog immediately so user can see the stats
      setTimeout(() => {
        setOpen(false)
        setM3uPlaylistUrl("")
        setImportStats(null)
      }, 2000)
    } catch (error) {
      console.error("Error importing M3U playlist:", error)
      setImportError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Import M3U Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import M3U Playlist</DialogTitle>
          <DialogDescription>
            Import an M3U playlist from a URL. This will add all channels from the playlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="m3u-url">M3U Playlist URL</Label>
            <Input
              id="m3u-url"
              value={m3uPlaylistUrl}
              onChange={(e) => setM3uPlaylistUrl(e.target.value)}
              placeholder="https://example.com/playlist.m3u"
            />
          </div>

          <div className="space-y-2">
            <Label>Import Mode</Label>
            <RadioGroup value={importMode} onValueChange={(value) => setImportMode(value as "merge" | "replace")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="merge" />
                <Label htmlFor="merge">Merge with existing playlist</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace">Replace existing playlist</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Merge will add new channels to your existing playlist. Replace will remove all existing channels.
            </p>
          </div>

          {importError && (
            <Alert variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {importStats && (
            <Alert>
              <AlertDescription>
                Successfully imported {importStats.channels} channels in {importStats.groups} groups.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={importM3uPlaylist} disabled={isImporting || !m3uPlaylistUrl.trim()}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

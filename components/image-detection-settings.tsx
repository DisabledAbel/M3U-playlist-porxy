"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Info } from "lucide-react"

export interface ImageDetectionSettings {
  enabled: boolean
  referenceImageUrl?: string
  similarityThreshold: number
  checkInterval: number
}

interface ImageDetectionSettingsProps {
  channelName: string
  settings: ImageDetectionSettings
  onSave: (settings: ImageDetectionSettings) => void
  onCancel: () => void
  open: boolean
}

export function ImageDetectionSettings({ channelName, settings, onSave, onCancel, open }: ImageDetectionSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ImageDetectionSettings>({
    enabled: settings.enabled || false,
    referenceImageUrl: settings.referenceImageUrl || "",
    similarityThreshold: settings.similarityThreshold || 85,
    checkInterval: settings.checkInterval || 10,
  })

  const handleSave = () => {
    onSave(localSettings)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Image Detection Settings</DialogTitle>
          <DialogDescription>
            Configure automatic backup switching when "{channelName}" shows a static image.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-detection"
              checked={localSettings.enabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enabled: checked === true })}
            />
            <Label
              htmlFor="enable-detection"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enable image detection
            </Label>
          </div>

          {localSettings.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reference-image">Reference Image URL</Label>
                <Input
                  id="reference-image"
                  value={localSettings.referenceImageUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, referenceImageUrl: e.target.value })}
                  placeholder="https://example.com/off-air-image.jpg"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground">
                  URL to an image that appears when the stream is offline or having issues.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="similarity-threshold">
                    Similarity Threshold ({localSettings.similarityThreshold}%)
                  </Label>
                </div>
                <Slider
                  id="similarity-threshold"
                  min={50}
                  max={100}
                  step={1}
                  value={[localSettings.similarityThreshold]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, similarityThreshold: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  How similar the current frame must be to the reference image to trigger backup.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="check-interval">Check Interval ({localSettings.checkInterval} seconds)</Label>
                </div>
                <Slider
                  id="check-interval"
                  min={5}
                  max={60}
                  step={5}
                  value={[localSettings.checkInterval]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, checkInterval: value[0] })}
                />
                <p className="text-xs text-muted-foreground">How often to check for the reference image.</p>
              </div>

              <div className="bg-blue-50 p-3 rounded-md flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p>This feature works by comparing video frames to your reference image.</p>
                  <p className="mt-1">For best results:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Use a clear, distinctive reference image</li>
                    <li>Adjust the similarity threshold based on testing</li>
                    <li>Set a reasonable check interval (5-15 seconds recommended)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

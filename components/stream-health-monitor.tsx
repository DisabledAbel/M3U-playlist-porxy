"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Activity, AlertTriangle, CheckCircle, Wifi, Clock, RefreshCw, Gauge } from "lucide-react"

interface StreamHealthMonitorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  streamUrl: string
  isPlaying: boolean
}

interface HealthMetrics {
  bufferHealth: number // 0-100%
  playbackQuality: string // e.g. "720p"
  droppedFrames: number
  latency: number // ms
  rebufferingEvents: number
  connectionStability: number // 0-100%
  bitrate: number // kbps
  resolution: string // e.g. "1280x720"
  currentTime: number // seconds
}

interface TimeSeriesPoint {
  time: number
  bufferHealth: number
  bitrate: number
  droppedFrames: number
}

export function StreamHealthMonitor({ videoRef, streamUrl, isPlaying }: StreamHealthMonitorProps) {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    bufferHealth: 0,
    playbackQuality: "Unknown",
    droppedFrames: 0,
    latency: 0,
    rebufferingEvents: 0,
    connectionStability: 100,
    bitrate: 0,
    resolution: "Unknown",
    currentTime: 0,
  })

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([])
  const [overallHealth, setOverallHealth] = useState<"good" | "warning" | "critical">("good")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isExpanded, setIsExpanded] = useState(false)

  // Refs to track metrics between intervals
  const metricsRef = useRef({
    lastDroppedFrames: 0,
    totalRebufferingEvents: 0,
    lastBitrateEstimate: 0,
    startTime: Date.now(),
    lastBufferLevel: 0,
    bufferHistory: [] as number[],
  })

  // Update metrics at regular intervals
  useEffect(() => {
    if (!videoRef.current || !isPlaying) return

    const video = videoRef.current
    const updateInterval = 1000 // Update every second

    // Function to update metrics
    const updateMetrics = () => {
      if (!video) return

      try {
        // Get current playback time
        const currentTime = video.currentTime

        // Calculate buffer health
        const buffered = video.buffered
        let bufferHealth = 0
        if (buffered.length > 0) {
          const bufferedEnd = buffered.end(buffered.length - 1)
          const bufferedAhead = bufferedEnd - currentTime
          const maxBufferSize = 30 // Assume 30 seconds is a full buffer
          bufferHealth = Math.min(100, (bufferedAhead / maxBufferSize) * 100)
        }

        // Track buffer changes for stability calculation
        metricsRef.current.bufferHistory.push(bufferHealth)
        if (metricsRef.current.bufferHistory.length > 10) {
          metricsRef.current.bufferHistory.shift()
        }

        // Calculate connection stability based on buffer consistency
        let connectionStability = 100
        if (metricsRef.current.bufferHistory.length > 5) {
          const bufferVariance = calculateVariance(metricsRef.current.bufferHistory)
          // Higher variance means less stability
          connectionStability = Math.max(0, 100 - bufferVariance / 2)
        }

        // Check for rebuffering events (when buffer decreases significantly)
        if (
          bufferHealth < metricsRef.current.lastBufferLevel - 20 &&
          bufferHealth < 30 &&
          metricsRef.current.lastBufferLevel > 0
        ) {
          metricsRef.current.totalRebufferingEvents++
        }
        metricsRef.current.lastBufferLevel = bufferHealth

        // Get resolution
        const resolution =
          video.videoWidth && video.videoHeight ? `${video.videoWidth}x${video.videoHeight}` : "Unknown"

        // Get playback quality label
        let playbackQuality = "Unknown"
        if (video.videoHeight) {
          if (video.videoHeight >= 2160) playbackQuality = "4K"
          else if (video.videoHeight >= 1440) playbackQuality = "2K"
          else if (video.videoHeight >= 1080) playbackQuality = "1080p"
          else if (video.videoHeight >= 720) playbackQuality = "720p"
          else if (video.videoHeight >= 480) playbackQuality = "480p"
          else if (video.videoHeight >= 360) playbackQuality = "360p"
          else playbackQuality = "240p"
        }

        // Estimate dropped frames using video playback quality if available
        let droppedFrames = 0
        if ("getVideoPlaybackQuality" in video) {
          const quality = (video as any).getVideoPlaybackQuality()
          if (quality) {
            droppedFrames = quality.droppedVideoFrames || 0
          }
        }

        // Estimate bitrate based on resolution
        // This is a very rough estimate
        let bitrate = 0
        if (video.videoHeight) {
          if (video.videoHeight >= 2160) bitrate = 20000
          else if (video.videoHeight >= 1440) bitrate = 12000
          else if (video.videoHeight >= 1080) bitrate = 6000
          else if (video.videoHeight >= 720) bitrate = 2500
          else if (video.videoHeight >= 480) bitrate = 1000
          else bitrate = 500
        }

        // Estimate latency (this is a placeholder - real latency would require server coordination)
        const latency = 100 + Math.random() * 100 // Simulated latency between 100-200ms

        // Update metrics state
        const updatedMetrics = {
          bufferHealth,
          playbackQuality,
          droppedFrames,
          latency,
          rebufferingEvents: metricsRef.current.totalRebufferingEvents,
          connectionStability,
          bitrate,
          resolution,
          currentTime,
        }
        setMetrics(updatedMetrics)

        // Add to time series data
        const now = Date.now()
        const newTimePoint: TimeSeriesPoint = {
          time: now,
          bufferHealth,
          bitrate,
          droppedFrames,
        }

        setTimeSeriesData((prev) => {
          const newData = [...prev, newTimePoint]
          // Keep only the last 60 data points (1 minute of data)
          if (newData.length > 60) {
            return newData.slice(newData.length - 60)
          }
          return newData
        })

        // Calculate overall health
        let health: "good" | "warning" | "critical" = "good"
        if (bufferHealth < 10 || connectionStability < 50 || metricsRef.current.totalRebufferingEvents > 5) {
          health = "critical"
        } else if (bufferHealth < 30 || connectionStability < 70 || metricsRef.current.totalRebufferingEvents > 2) {
          health = "warning"
        }
        setOverallHealth(health)

        // Update last update time
        setLastUpdate(new Date())
      } catch (error) {
        console.error("Error updating stream health metrics:", error)
      }
    }

    // Set up interval for regular updates
    const intervalId = setInterval(updateMetrics, updateInterval)

    // Set up event listeners for specific events
    const handleWaiting = () => {
      metricsRef.current.totalRebufferingEvents++
    }

    const handleError = () => {
      setOverallHealth("critical")
    }

    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("error", handleError)

    // Initial update
    updateMetrics()

    return () => {
      clearInterval(intervalId)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("error", handleError)
    }
  }, [videoRef, isPlaying, streamUrl])

  // Helper function to calculate variance of an array
  const calculateVariance = (array: number[]): number => {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length
    const squareDiffs = array.map((val) => Math.pow(val - mean, 2))
    return squareDiffs.reduce((sum, val) => sum + val, 0) / array.length
  }

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Format chart time for x-axis
  const formatChartTime = (time: number): string => {
    const date = new Date(time)
    return date.toLocaleTimeString([], { hour: undefined, minute: "2-digit", second: "2-digit" })
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Stream Health Monitor
          <Badge
            className={
              overallHealth === "good" ? "bg-green-500" : overallHealth === "warning" ? "bg-yellow-500" : "bg-red-500"
            }
          >
            {overallHealth === "good" ? "Good" : overallHealth === "warning" ? "Warning" : "Critical"}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Last updated: {formatTime(lastUpdate)}</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            {isExpanded ? "Show Less" : "Show More"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center gap-1 mb-1">
              <Wifi className="h-4 w-4" /> Buffer Health
            </div>
            <Progress value={metrics.bufferHealth} className="h-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs">{Math.round(metrics.bufferHealth)}%</span>
              <span
                className={`text-xs ${
                  metrics.bufferHealth > 50
                    ? "text-green-500"
                    : metrics.bufferHealth > 20
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {metrics.bufferHealth > 50 ? "Good" : metrics.bufferHealth > 20 ? "Low" : "Critical"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center gap-1 mb-1">
              <Gauge className="h-4 w-4" /> Connection Stability
            </div>
            <Progress value={metrics.connectionStability} className="h-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs">{Math.round(metrics.connectionStability)}%</span>
              <span
                className={`text-xs ${
                  metrics.connectionStability > 80
                    ? "text-green-500"
                    : metrics.connectionStability > 50
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {metrics.connectionStability > 80 ? "Stable" : metrics.connectionStability > 50 ? "Unstable" : "Poor"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Rebuffering Events
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{metrics.rebufferingEvents}</span>
              <span
                className={`text-xs ${
                  metrics.rebufferingEvents === 0
                    ? "text-green-500"
                    : metrics.rebufferingEvents < 3
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {metrics.rebufferingEvents === 0
                  ? "No interruptions"
                  : metrics.rebufferingEvents < 3
                    ? "Minor interruptions"
                    : "Frequent interruptions"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" /> Latency
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{Math.round(metrics.latency)}</span>
              <span className="text-xs">ms</span>
              <span
                className={`text-xs ${
                  metrics.latency < 100 ? "text-green-500" : metrics.latency < 300 ? "text-yellow-500" : "text-red-500"
                }`}
              >
                {metrics.latency < 100 ? "Low" : metrics.latency < 300 ? "Medium" : "High"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium">Quality</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{metrics.playbackQuality}</span>
              <span className="text-xs">{metrics.resolution}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium">Bitrate</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{metrics.bitrate}</span>
              <span className="text-xs">kbps</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4">
            <Tabs defaultValue="buffer">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="buffer">Buffer Health</TabsTrigger>
                <TabsTrigger value="bitrate">Bitrate</TabsTrigger>
                <TabsTrigger value="frames">Dropped Frames</TabsTrigger>
              </TabsList>

              <TabsContent value="buffer" className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatChartTime}
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                      height={20}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={30} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Buffer Health"]}
                      labelFormatter={(label) => formatChartTime(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="bufferHealth"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="bitrate" className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatChartTime}
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                      height={20}
                    />
                    <YAxis tick={{ fontSize: 12 }} width={40} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(0)} kbps`, "Bitrate"]}
                      labelFormatter={(label) => formatChartTime(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="bitrate"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="frames" className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatChartTime}
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                      height={20}
                    />
                    <YAxis tick={{ fontSize: 12 }} width={30} />
                    <Tooltip
                      formatter={(value: number) => [`${value}`, "Dropped Frames"]}
                      labelFormatter={(label) => formatChartTime(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="droppedFrames"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2">Stream Health Analysis</h4>
                <div className="text-xs space-y-1">
                  {overallHealth === "good" && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>
                        Stream is performing well with good buffer health and stable connection. Continue monitoring for
                        any changes.
                      </span>
                    </div>
                  )}

                  {overallHealth === "warning" && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>
                        Stream performance is degraded. Buffer health is low or connection stability has decreased.
                        Consider switching to a backup stream if issues persist.
                      </span>
                    </div>
                  )}

                  {overallHealth === "critical" && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>
                        Stream is experiencing critical issues. Frequent rebuffering or very low buffer health detected.
                        Recommend switching to a backup stream immediately.
                      </span>
                    </div>
                  )}

                  {metrics.bufferHealth < 30 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>
                        Low buffer health ({Math.round(metrics.bufferHealth)}%) may cause playback interruptions.
                      </span>
                    </div>
                  )}

                  {metrics.connectionStability < 70 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>
                        Connection stability is below optimal levels ({Math.round(metrics.connectionStability)}%).
                      </span>
                    </div>
                  )}

                  {metrics.rebufferingEvents > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          metrics.rebufferingEvents > 3 ? "text-red-500" : "text-yellow-500"
                        } mt-0.5`}
                      />
                      <span>
                        {metrics.rebufferingEvents} rebuffering events detected, which may indicate network issues or
                        stream problems.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2">Technical Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="font-medium">Stream URL:</div>
                  <div className="truncate">{streamUrl}</div>

                  <div className="font-medium">Resolution:</div>
                  <div>{metrics.resolution}</div>

                  <div className="font-medium">Quality:</div>
                  <div>{metrics.playbackQuality}</div>

                  <div className="font-medium">Bitrate:</div>
                  <div>{metrics.bitrate} kbps</div>

                  <div className="font-medium">Current Time:</div>
                  <div>{formatTime(new Date(metrics.currentTime * 1000))}</div>

                  <div className="font-medium">Monitoring Since:</div>
                  <div>{formatTime(new Date(metricsRef.current.startTime))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

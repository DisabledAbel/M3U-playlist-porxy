import type { NextRequest } from "next/server"
import { spawn } from "child_process"
import { Readable } from "stream"
import { exec } from "child_process"
import { promisify } from "util"

// Convert exec to a promise-based function
const execPromise = promisify(exec)

export const dynamic = "force-dynamic" // Changed from force_dynamic to force-dynamic
export const runtime = "nodejs" // Use Node.js runtime for ffmpeg

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  const format = request.nextUrl.searchParams.get("format") || "hls" // Default to HLS
  const resolution = request.nextUrl.searchParams.get("resolution") || "720" // Default to 720p
  const bitrate = request.nextUrl.searchParams.get("bitrate") || "1500k" // Default to 1500k

  if (!url) {
    return new Response("Missing stream URL", { status: 400 })
  }

  console.log(`Transcoding stream: ${url} to ${format} at ${resolution}p (${bitrate})`)

  try {
    // Check if ffmpeg is available using ES module compatible approach
    try {
      await execPromise("ffmpeg -version")
    } catch (error) {
      console.error("FFmpeg not available:", error)
      return new Response("Transcoding requires FFmpeg to be installed on the server", { status: 500 })
    }

    // Set up ffmpeg arguments based on format and resolution
    const ffmpegArgs = ["-i", url, "-c:v", "libx264", "-c:a", "aac", "-b:v", bitrate]

    // Add resolution-specific settings
    if (Number.parseInt(resolution) >= 1440) {
      // For high resolutions, use a higher profile
      ffmpegArgs.push("-profile:v", "high", "-level:v", "5.1")
    } else if (Number.parseInt(resolution) <= 360) {
      // For low resolutions, use baseline profile for better compatibility
      ffmpegArgs.push("-profile:v", "baseline", "-level:v", "3.0")
    } else {
      // For medium resolutions, use main profile
      ffmpegArgs.push("-profile:v", "main", "-level:v", "4.0")
    }

    // Add the scale filter
    ffmpegArgs.push("-vf", `scale=-2:${resolution}`)

    // Add preset and format
    ffmpegArgs.push("-preset", "veryfast", "-f", format === "hls" ? "hls" : "mpegts")

    if (format === "hls") {
      ffmpegArgs.push(
        "-hls_time",
        "4",
        "-hls_list_size",
        "10",
        "-hls_flags",
        "delete_segments",
        "-hls_segment_type",
        "mpegts",
        "pipe:1",
      )
    } else {
      ffmpegArgs.push("pipe:1")
    }

    // Spawn ffmpeg process
    const ffmpeg = spawn("ffmpeg", ffmpegArgs)

    // Handle errors
    ffmpeg.stderr.on("data", (data) => {
      console.log(`FFmpeg: ${data.toString()}`)
    })

    ffmpeg.on("error", (err) => {
      console.error("FFmpeg process error:", err)
    })

    // Create a readable stream from the ffmpeg output
    const stream = Readable.fromWeb(ffmpeg.stdout)

    // Set appropriate headers based on format
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
    })

    if (format === "hls") {
      headers.set("Content-Type", "application/vnd.apple.mpegurl")
    } else {
      headers.set("Content-Type", "video/mp2t")
    }

    // Return the stream
    return new Response(stream as any, {
      headers,
    })
  } catch (error) {
    console.error("Error transcoding stream:", error)
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
    },
  })
}

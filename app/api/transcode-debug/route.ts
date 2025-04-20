import type { NextRequest } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

// Convert exec to a promise-based function
const execPromise = promisify(exec)

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  const format = request.nextUrl.searchParams.get("format") || "hls"
  const resolution = request.nextUrl.searchParams.get("resolution") || "720"
  const bitrate = request.nextUrl.searchParams.get("bitrate") || "1500k"

  if (!url) {
    return Response.json({ error: "Missing URL parameter" }, { status: 400 })
  }

  try {
    // Check if ffmpeg is available using ES module compatible approach
    let ffmpegAvailable = false
    try {
      // Use exec instead of spawn to check for ffmpeg
      await execPromise("ffmpeg -version")
      ffmpegAvailable = true
    } catch (error) {
      console.error("FFmpeg not available:", error)
      ffmpegAvailable = false
    }

    // Fetch the original stream headers to check format
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    // Get headers as an object
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return Response.json({
      url,
      status: response.status,
      statusText: response.statusText,
      headers,
      ffmpegAvailable,
      transcodeOptions: {
        format,
        resolution,
        bitrate,
      },
      transcodingEndpoint: `/api/transcode?url=${encodeURIComponent(url)}&format=${format}&resolution=${resolution}&bitrate=${bitrate}`,
    })
  } catch (error) {
    console.error("Error in transcode-debug endpoint:", error)
    return Response.json(
      {
        error: "Failed to check stream",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

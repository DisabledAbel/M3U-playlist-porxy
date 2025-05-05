import type { NextRequest } from "next/server"
import { backupStreamsStore } from "../backup-streams/route"
// Import the image detection store
import { imageDetectionStore } from "../image-detection/route"

// Update the GET function to include retry logic for the playlist route as well
export async function GET(request: NextRequest) {
  // Get parameters
  const url = request.nextUrl.searchParams.get("url")
  const debug = request.nextUrl.searchParams.get("debug") === "true"
  const direct = request.nextUrl.searchParams.get("direct") === "true"
  const transcode = request.nextUrl.searchParams.get("transcode") === "true"
  const format = request.nextUrl.searchParams.get("format") || "hls"
  const resolution = request.nextUrl.searchParams.get("resolution") || "720"
  const bitrate = request.nextUrl.searchParams.get("bitrate") || "1500k"
  const includeBackups = request.nextUrl.searchParams.get("backups") !== "false" // Default to true

  if (!url) {
    return new Response("Missing playlist URL", { status: 400 })
  }

  console.log("Fetching playlist from:", url)

  try {
    // Implement retry logic with exponential backoff
    const maxRetries = 3
    let retryCount = 0
    let response = null
    let lastError = null

    while (retryCount < maxRetries) {
      try {
        // Add a delay with exponential backoff if this is a retry
        if (retryCount > 0) {
          const delay = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
          console.log(`Retry ${retryCount}/${maxRetries} after ${delay}ms delay`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        // Fetch with improved headers and varying user agents to avoid rate limiting
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        ]

        const randomUserAgent = userAgents[retryCount % userAgents.length]

        response = await fetch(url, {
          headers: {
            "User-Agent": randomUserAgent,
            Accept: "*/*",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        // If we get a 429, throw an error to trigger retry
        if (response.status === 429) {
          // Get the retry-after header if available
          const retryAfter = response.headers.get("Retry-After")
          throw new Error(`Rate limited (429). ${retryAfter ? `Retry after ${retryAfter}` : ""}`)
        }

        // If we get here, the request was successful
        break
      } catch (error) {
        lastError = error
        retryCount++
        console.warn(`Attempt ${retryCount} failed:`, error)

        // If this was the last retry, we'll exit the loop and throw
        if (retryCount >= maxRetries) {
          console.error("All retry attempts failed")
        }
      }
    }

    // If all retries failed, throw the last error
    if (!response) {
      throw new Error(lastError?.message || "Failed to fetch playlist after multiple attempts")
    }

    if (!response.ok) {
      console.error(`Failed to fetch playlist: ${response.status} ${response.statusText}`)
      return new Response(
        `Failed to fetch playlist: ${response.status} ${response.statusText}${response.status === 429 ? " - The source server is rate limiting requests. Please try again later." : ""}`,
        {
          status: response.status,
        },
      )
    }

    // Get the playlist content
    const content = await response.text()

    // If debug mode is enabled, return the raw playlist
    if (debug) {
      return new Response(content, {
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Process the playlist with a completely new approach
    const baseUrl = new URL(request.url).origin
    const processedContent = processPlaylistSimple(
      content,
      baseUrl,
      direct,
      transcode,
      format,
      resolution,
      bitrate,
      includeBackups,
    )

    // Return the processed playlist
    return new Response(processedContent, {
      headers: {
        "Content-Type": "application/x-mpegURL",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error processing playlist:", error)
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
    })
  }
}

// Completely rewritten processPlaylistSimple function to properly handle backup streams
function processPlaylistSimple(
  content: string,
  baseUrl: string,
  direct: boolean,
  transcode = false,
  format = "hls",
  resolution = "720",
  bitrate = "1500k",
  includeBackups = true,
): string {
  // Normalize line endings
  const normalizedContent = content.replace(/\r\n/g, "\n")
  const lines = normalizedContent.split("\n")
  const result: string[] = []

  console.log(`Processing ${lines.length} lines in playlist`)

  // Track stats for debugging
  let extinfs = 0
  let urls = 0
  let channelCounter = 0 // Use a simple counter for channel IDs

  // Ensure the playlist starts with #EXTM3U if it doesn't already
  if (!lines.some((line) => line.trim().startsWith("#EXTM3U"))) {
    result.push("#EXTM3U")
  } else {
    // Keep the original #EXTM3U line with any attributes
    const extM3ULine = lines.find((line) => line.trim().startsWith("#EXTM3U"))
    if (extM3ULine) {
      result.push(extM3ULine)
    } else {
      result.push("#EXTM3U")
    }
  }

  // Process each line
  let currentExtInf = ""
  let currentChannelId = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and the #EXTM3U line (already handled)
    if (!line || line.startsWith("#EXTM3U")) continue

    // Handle EXTINF lines - store for the next URL line
    if (line.startsWith("#EXTINF")) {
      extinfs++
      currentExtInf = line
      result.push(line)
      continue
    }

    // Handle all other comment/directive lines
    if (line.startsWith("#")) {
      result.push(line)
      continue
    }

    // Handle URL lines (anything that's not a comment or empty)
    if (line.includes("://")) {
      urls++
      channelCounter++ // Increment channel counter for each URL
      currentChannelId = `channel_${channelCounter}` // Generate a simple numeric ID

      // Process the primary URL
      let processedUrl: string
      if (transcode) {
        processedUrl = `${baseUrl}/api/transcode?url=${encodeURIComponent(line)}&format=${format}&resolution=${resolution}&bitrate=${bitrate}`
      } else if (direct) {
        processedUrl = `${baseUrl}/api/direct-stream?url=${encodeURIComponent(line)}`
      } else {
        processedUrl = `${baseUrl}/api/stream?url=${encodeURIComponent(line)}`
      }

      result.push(processedUrl)

      // Add backup streams if available and enabled
      if (includeBackups) {
        console.log(`Looking for backup streams for channel ID: ${currentChannelId}`)
        const backupStreams = backupStreamsStore[currentChannelId] || []
        console.log(`Found ${backupStreams.length} backup streams for ${currentChannelId}`)

        // Add image detection info if enabled
        const imageDetection = imageDetectionStore[currentChannelId]
        if (imageDetection?.enabled && imageDetection.referenceImageUrl) {
          result.push(
            `#EXT-X-IMAGE-DETECTION=${imageDetection.similarityThreshold},${imageDetection.checkInterval},${encodeURIComponent(imageDetection.referenceImageUrl)}`,
          )
        }

        // Add backup streams in the correct format
        if (backupStreams.length > 0) {
          const channelName = extractChannelName(currentExtInf)

          // Add a comment to indicate these are backup streams
          result.push(
            `#EXTINF:-1 tvg-id="${currentChannelId}_backups" group-title="Backups",--- ${channelName} Backups ---`,
          )

          for (const backup of backupStreams) {
            // Add a proper EXTINF line for each backup
            result.push(
              `#EXTINF:-1 tvg-id="${currentChannelId}_backup_${backup.priority}" tvg-name="${channelName} (Backup ${backup.priority})",${channelName} (Backup ${backup.priority})`,
            )

            // Process the backup URL the same way as the primary
            let backupProcessedUrl: string
            if (transcode) {
              backupProcessedUrl = `${baseUrl}/api/transcode?url=${encodeURIComponent(backup.url)}&format=${format}&resolution=${resolution}&bitrate=${bitrate}`
            } else if (direct) {
              backupProcessedUrl = `${baseUrl}/api/direct-stream?url=${encodeURIComponent(backup.url)}`
            } else {
              backupProcessedUrl = `${baseUrl}/api/stream?url=${encodeURIComponent(backup.url)}`
            }

            result.push(backupProcessedUrl)
          }
        }
      }
    } else {
      // Not a URL, keep as is
      result.push(line)
    }
  }

  console.log(`Processed ${extinfs} EXTINF entries and ${urls} URLs`)
  return result.join("\n")
}

// Helper function to extract the channel name from an EXTINF line
function extractChannelName(extinf: string): string {
  // The channel name is typically after the last comma
  const commaIndex = extinf.lastIndexOf(",")
  if (commaIndex !== -1) {
    return extinf.substring(commaIndex + 1).trim()
  }
  return "Unknown Channel"
}

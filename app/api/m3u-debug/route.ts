import type { NextRequest } from "next/server"

// Helper function to generate a URL-safe channel ID
function generateChannelId(name: string, tvgId: string | null): string {
  if (tvgId) return tvgId

  try {
    return Buffer.from(name)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
      .substring(0, 16)
  } catch (error) {
    // Fallback to a simple hash if encoding fails
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `hash-${Math.abs(hash).toString(16).substring(0, 8)}`
  }
}

// Helper function to safely handle image URLs
function sanitizeImageUrl(url: string | null): string | null {
  if (!url) return null

  try {
    // Remove any problematic characters or encoding issues
    return url.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
  } catch (error) {
    return null
  }
}

// Update the GET function to include retry logic for the m3u-debug route
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return Response.json({ error: "Missing URL parameter" }, { status: 400 })
  }

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
          throw new Error("Rate limited (429)")
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
      return Response.json(
        {
          error: `Failed to fetch playlist: ${response.status} ${response.statusText}`,
          message:
            response.status === 429
              ? "The source server is rate limiting requests. Please try again later."
              : undefined,
        },
        { status: response.status },
      )
    }

    // Get the playlist content
    const content = await response.text()

    // Parse the playlist to extract detailed info
    const lines = content.split(/\r?\n/)
    const extinfs = lines.filter((line) => line.startsWith("#EXTINF")).length
    const urls = lines.filter((line) => !line.startsWith("#") && line.trim() !== "" && line.includes("://")).length

    // Extract all channels for debugging
    const channels = []
    let currentExtInf = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith("#EXTINF")) {
        currentExtInf = line
      } else if (currentExtInf && line.includes("://")) {
        try {
          // Extract channel name from EXTINF
          const commaIndex = currentExtInf.lastIndexOf(",")
          const name = commaIndex !== -1 ? currentExtInf.substring(commaIndex + 1).trim() : "Unknown Channel"

          // Extract tvg-id if available
          const tvgIdMatch = currentExtInf.match(/tvg-id="([^"]*)"/)
          const tvgId = tvgIdMatch ? tvgIdMatch[1] : null

          // Extract group if available
          const groupMatch = currentExtInf.match(/group-title="([^"]*)"/)
          const group = groupMatch ? groupMatch[1] : null

          // Extract logo if available and sanitize it
          const logoMatch = currentExtInf.match(/tvg-logo="([^"]*)"/)
          const logo = logoMatch ? sanitizeImageUrl(logoMatch[1]) : null

          // Generate a consistent ID for this channel
          const id = generateChannelId(name, tvgId)

          channels.push({
            id,
            name,
            tvgId,
            group,
            logo,
            info: currentExtInf,
            url: line,
          })
        } catch (error) {
          console.error("Error processing channel:", error)
          // Skip this channel if there's an error
        }
        currentExtInf = null
      }
    }

    // Check for common issues
    const issues = []
    if (!content.includes("#EXTM3U")) {
      issues.push("Missing #EXTM3U header")
    }
    if (extinfs === 0) {
      issues.push("No #EXTINF entries found")
    }
    if (urls === 0) {
      issues.push("No URLs found")
    }
    if (extinfs > 0 && urls === 0) {
      issues.push("Found EXTINF entries but no URLs")
    }
    if (extinfs === 0 && urls > 0) {
      issues.push("Found URLs but no EXTINF entries")
    }
    if (extinfs !== urls) {
      issues.push(`Mismatch between EXTINF entries (${extinfs}) and URLs (${urls})`)
    }

    return Response.json({
      url,
      status: response.status,
      statusText: response.statusText,
      contentLength: content.length,
      lineCount: lines.length,
      extinfs,
      urls,
      hasExtM3U: content.includes("#EXTM3U"),
      channels: channels,
      firstLines: lines.slice(0, 20),
      issues: issues.length > 0 ? issues : null,
    })
  } catch (error) {
    console.error("Error in m3u-debug endpoint:", error)
    return Response.json(
      {
        error: "Failed to analyze playlist",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

import type { NextRequest } from "next/server"

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

    // Parse the playlist to extract channels
    const channels = extractChannelsFromM3u(content)

    // Extract unique groups from the channels
    const groups = Array.from(new Set(channels.map((channel) => channel.group).filter(Boolean)))

    return Response.json({
      success: true,
      url,
      channelCount: channels.length,
      channels,
      groups,
    })
  } catch (error) {
    console.error("Error importing M3U playlist:", error)
    return Response.json(
      {
        error: "Failed to import playlist",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Function to extract channels from an M3U playlist
function extractChannelsFromM3u(content: string): any[] {
  const channels: any[] = []
  // Handle different line endings
  const normalizedContent = content.replace(/\r\n/g, "\n")
  const lines = normalizedContent.split("\n")

  let currentExtInf = ""
  let channelCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("#EXTINF")) {
      currentExtInf = line
    } else if (line.includes("://") && currentExtInf) {
      // This is a URL line and we have an EXTINF line
      channelCounter++
      const safeId = `channel_${channelCounter}`

      // Extract channel name
      let name = "Unknown Channel"
      const commaIndex = currentExtInf.lastIndexOf(",")
      if (commaIndex !== -1) {
        name = currentExtInf.substring(commaIndex + 1).trim()
      }

      // Extract tvg-id if available
      let tvgId = null
      const tvgIdMatch = currentExtInf.match(/tvg-id="([^"]*)"/)
      if (tvgIdMatch && tvgIdMatch[1]) {
        tvgId = tvgIdMatch[1]
      }

      // Extract group if available
      let group = null
      const groupMatch = currentExtInf.match(/group-title="([^"]*)"/)
      if (groupMatch && groupMatch[1]) {
        group = groupMatch[1]
      }

      // Extract logo if available
      let logo = null
      const logoMatch = currentExtInf.match(/tvg-logo="([^"]*)"/)
      if (logoMatch && logoMatch[1]) {
        logo = logoMatch[1]
      }

      channels.push({
        id: safeId,
        originalId: tvgId,
        name,
        extinf: currentExtInf,
        url: line,
        group,
        tvgId,
        logo,
      })

      currentExtInf = "" // Reset for the next channel
    }
  }

  return channels
}

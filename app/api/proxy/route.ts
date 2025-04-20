import { type NextRequest, NextResponse } from "next/server"

// Replace the entire GET function with this improved version that includes retry logic
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 })
  }

  try {
    console.log("Fetching playlist from:", url)

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
          let retryDelay = 0

          if (retryAfter) {
            // Retry-After can be a date or seconds
            if (isNaN(Number(retryAfter))) {
              // It's a date
              retryDelay = new Date(retryAfter).getTime() - Date.now()
            } else {
              // It's seconds
              retryDelay = Number(retryAfter) * 1000
            }

            // Ensure delay is reasonable
            retryDelay = Math.min(retryDelay, 30000) // Max 30 seconds
          }

          throw new Error(`Rate limited (429). ${retryAfter ? `Retry after ${retryDelay}ms` : ""}`)
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
      return NextResponse.json(
        {
          error: "Failed to fetch playlist",
          status: response.status,
          statusText: response.statusText,
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
    console.log("Playlist content length:", content.length)

    // Basic validation for M3U playlist
    if (!content.includes("#EXTM3U") && !content.trim().startsWith("#EXTINF")) {
      console.error("Invalid M3U playlist - missing #EXTM3U or #EXTINF")
      return NextResponse.json({ error: "Invalid M3U playlist" }, { status: 400 })
    }

    // Extract groups from the playlist
    const groups = extractGroups(content)
    console.log("Extracted groups:", Array.from(groups))

    return NextResponse.json({
      success: true,
      groups: Array.from(groups),
    })
  } catch (error) {
    console.error("Error proxying playlist:", error)
    return NextResponse.json(
      {
        error: "Failed to proxy playlist",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Improved group extraction
function extractGroups(content: string): Set<string> {
  const groups = new Set<string>()

  // Handle different line endings
  const normalizedContent = content.replace(/\r\n/g, "\n")
  const lines = normalizedContent.split("\n")

  console.log(`Extracting groups from ${lines.length} lines`)

  for (const line of lines) {
    if (line.includes("#EXTINF")) {
      // Try different patterns for group-title extraction
      let match = line.match(/group-title="([^"]*)"/)
      if (!match) {
        match = line.match(/group-title='([^']*)'/)
      }
      if (!match) {
        match = line.match(/group-title=([^,]*)/)
      }

      if (match && match[1]) {
        groups.add(match[1].trim())
      }
    }
  }

  return groups
}

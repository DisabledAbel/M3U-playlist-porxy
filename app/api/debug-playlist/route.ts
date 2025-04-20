import type { NextRequest } from "next/server"

// This endpoint helps debug issues with playlist processing
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

    // Parse the playlist to extract basic info
    const lines = content.split(/\r?\n/)
    const extinfs = lines.filter((line) => line.startsWith("#EXTINF")).length
    const urls = lines.filter((line) => !line.startsWith("#") && line.trim() !== "" && line.includes("://")).length

    // Get headers as an object
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return Response.json({
      url,
      status: response.status,
      statusText: response.statusText,
      contentLength: content.length,
      lineCount: lines.length,
      extinfs,
      urls,
      headers,
      contentPreview: content.substring(0, 1000),
      hasExtM3U: content.includes("#EXTM3U"),
    })
  } catch (error) {
    console.error("Error in debug-playlist endpoint:", error)
    return Response.json(
      {
        error: "Failed to fetch playlist",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

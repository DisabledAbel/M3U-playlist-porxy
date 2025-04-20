import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new Response("Missing stream URL", { status: 400 })
  }

  console.log("Streaming from URL:", url)

  try {
    // Implement retry logic with exponential backoff
    const maxRetries = 2 // Fewer retries for streaming to avoid long delays
    let retryCount = 0
    let response = null
    let lastError = null

    while (retryCount < maxRetries) {
      try {
        // Add a delay with exponential backoff if this is a retry
        if (retryCount > 0) {
          const delay = Math.pow(2, retryCount) * 500 // 500ms, 1000ms - shorter delays for streaming
          console.log(`Retry ${retryCount}/${maxRetries} after ${delay}ms delay`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        // Fetch with improved headers and varying user agents to avoid rate limiting
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
        ]

        const randomUserAgent = userAgents[retryCount % userAgents.length]

        response = await fetch(url, {
          headers: {
            "User-Agent": randomUserAgent,
            Accept: "*/*",
            Range: request.headers.get("Range") || "",
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
        console.warn(`Stream attempt ${retryCount} failed:`, error)

        // If this was the last retry, we'll exit the loop and throw
        if (retryCount >= maxRetries) {
          console.error("All stream retry attempts failed")
        }
      }
    }

    // If all retries failed, throw the last error
    if (!response) {
      throw new Error(lastError?.message || "Failed to fetch stream after multiple attempts")
    }

    if (!response.ok) {
      console.error(`Stream fetch failed: ${response.status} ${response.statusText}`)
      return new Response(
        `Failed to fetch stream: ${response.status} ${response.statusText}${response.status === 429 ? " - The source server is rate limiting requests." : ""}`,
        {
          status: response.status,
        },
      )
    }

    // Create response headers
    const responseHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
    })

    // Copy important headers
    const headersToForward = ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]
    for (const header of headersToForward) {
      const value = response.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    }

    // Ensure we have a content type
    if (!responseHeaders.has("Content-Type")) {
      responseHeaders.set("Content-Type", "application/octet-stream")
    }

    // Return the stream
    return new Response(response.body, {
      headers: responseHeaders,
      status: response.status,
    })
  } catch (error) {
    console.error("Error streaming content:", error)
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

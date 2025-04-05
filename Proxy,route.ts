import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 })
  }

  try {
    console.log("Fetching playlist from:", url)

    // Fetch with improved headers
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "*/*",
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch playlist: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: "Failed to fetch playlist", status: response.status },
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


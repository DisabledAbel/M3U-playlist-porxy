import type { NextRequest } from "next/server"

// Simple in-memory storage for backup streams
// In a production app, you would use a database
const backupStreamsStore: Record<string, { url: string; priority: number }[]> = {}

export async function GET(request: NextRequest) {
  try {
    // Get the channel ID from the query parameters
    const url = new URL(request.url)
    const channelId = url.searchParams.get("channelId")

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    console.log(`Retrieving backup streams for channel ID: ${channelId}`)

    // Use the channel ID as-is without any validation or transformation
    const backupStreams = backupStreamsStore[channelId] || []

    return Response.json({
      backupStreams,
      channelId,
    })
  } catch (error) {
    console.error("Error retrieving backup streams:", error)
    return Response.json(
      {
        error: "Failed to retrieve backup streams",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body safely
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return Response.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    let { channelId, originalId, streams } = body

    // Validate required fields
    if (!channelId || typeof channelId !== "string") {
      return Response.json({ error: "Missing or invalid channelId parameter" }, { status: 400 })
    }

    if (!Array.isArray(streams)) {
      return Response.json({ error: "Streams must be an array" }, { status: 400 })
    }

    // Ensure originalId is always a string or null, never undefined
    if (originalId === undefined) {
      originalId = null
    }

    console.log(`Saving backup streams for channel ID: ${channelId}, original ID: ${originalId || "unknown"}`)
    console.log(`Received ${streams.length} streams`)

    // Validate stream URLs
    const validStreams = streams.filter((stream) => {
      try {
        // Basic URL validation
        if (typeof stream.url !== "string" || stream.url.trim() === "") {
          return false
        }

        // More thorough URL validation
        try {
          new URL(stream.url)
          return true
        } catch (urlError) {
          console.warn("Invalid URL format:", stream.url, urlError)
          return false
        }
      } catch (e) {
        console.warn("Invalid stream:", stream, e)
        return false
      }
    })

    console.log(`Found ${validStreams.length} valid streams`)

    // Store the backup streams using the channel ID as the key
    backupStreamsStore[channelId] = validStreams.map((stream: any, index: number) => ({
      url: stream.url,
      priority: typeof stream.priority === "number" ? stream.priority : index + 1,
    }))

    // Log the updated store for debugging
    console.log(`Updated backupStreamsStore for ${channelId}:`, backupStreamsStore[channelId])

    // Return the updated store for debugging
    return Response.json({
      success: true,
      backupStreams: backupStreamsStore[channelId],
      channelId,
      originalId,
    })
  } catch (error) {
    console.error("Error saving backup streams:", error)
    return Response.json(
      {
        error: "Failed to save backup streams",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Export the store for use in other routes
export { backupStreamsStore }

import type { NextRequest } from "next/server"

// Simple in-memory storage for backup streams
// In a production app, you would use a database
const backupStreamsStore: Record<string, { url: string; priority: number }[]> = {}

export async function GET(request: NextRequest) {
  try {
    const channelId = request.nextUrl.searchParams.get("channelId")

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    console.log(`Retrieving backup streams for channel ID: ${channelId}`)

    // No validation needed - we accept any channel ID format now
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
    const body = await request.json()
    const { channelId, originalId, streams } = body

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    if (!Array.isArray(streams)) {
      return Response.json({ error: "Streams must be an array" }, { status: 400 })
    }

    console.log(`Saving backup streams for channel ID: ${channelId}, original ID: ${originalId || "unknown"}`)
    console.log(`Received ${streams.length} streams`)

    // Validate stream URLs
    const validStreams = streams.filter((stream) => {
      try {
        // Basic URL validation
        return typeof stream.url === "string" && stream.url.trim() !== "" && stream.url.includes("://")
      } catch (e) {
        return false
      }
    })

    // Store the backup streams using the channel ID as the key
    backupStreamsStore[channelId] = validStreams.map((stream: any, index: number) => ({
      url: stream.url,
      priority: stream.priority || index + 1,
    }))

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

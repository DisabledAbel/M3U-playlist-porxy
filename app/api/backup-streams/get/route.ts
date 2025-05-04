import type { NextRequest } from "next/server"
import { backupStreamsStore } from "../route"

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

    const { channelId } = body

    if (!channelId || typeof channelId !== "string") {
      return Response.json({ error: "Missing or invalid channelId parameter" }, { status: 400 })
    }

    console.log(`Retrieving backup streams for channel ID: ${channelId}`)
    console.log(`Available keys in backupStreamsStore:`, Object.keys(backupStreamsStore))

    // Use the channel ID as-is without any validation or transformation
    const backupStreams = backupStreamsStore[channelId] || []
    console.log(`Found ${backupStreams.length} backup streams for channel ID: ${channelId}`)

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

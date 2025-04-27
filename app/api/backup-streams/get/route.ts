import type { NextRequest } from "next/server"
import { backupStreamsStore } from "../route"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId } = body

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

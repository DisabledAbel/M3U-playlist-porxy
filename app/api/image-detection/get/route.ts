import type { NextRequest } from "next/server"
import { imageDetectionStore } from "../route"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId } = body

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    console.log(`Retrieving image detection settings for channel ID: ${channelId}`)

    // Use the channel ID as-is without any validation or transformation
    const settings = imageDetectionStore[channelId] || {
      enabled: false,
      similarityThreshold: 85,
      checkInterval: 10,
    }

    return Response.json({
      settings,
      channelId,
    })
  } catch (error) {
    console.error("Error retrieving image detection settings:", error)
    return Response.json(
      {
        error: "Failed to retrieve image detection settings",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

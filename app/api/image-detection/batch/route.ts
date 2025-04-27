import type { NextRequest } from "next/server"
import { imageDetectionStore } from "../route"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channels } = body

    if (!Array.isArray(channels)) {
      return Response.json({ error: "Channels must be an array" }, { status: 400 })
    }

    console.log(`Processing batch request for ${channels.length} channels`)

    // Create a results object to store the image detection settings for each channel
    const results: Record<string, any> = {}

    // Process each channel
    channels.forEach((channel) => {
      const { id } = channel
      if (id) {
        results[id] = imageDetectionStore[id] || {
          enabled: false,
          similarityThreshold: 85,
          checkInterval: 10,
        }
      }
    })

    return Response.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error processing batch image detection request:", error)
    return Response.json(
      {
        error: "Failed to process batch request",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

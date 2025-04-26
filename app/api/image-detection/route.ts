import type { NextRequest } from "next/server"

// Simple in-memory storage for image detection settings
// In a production app, you would use a database
const imageDetectionStore: Record<
  string,
  {
    enabled: boolean
    referenceImageUrl?: string
    similarityThreshold: number
    checkInterval: number
  }
> = {}

export async function GET(request: NextRequest) {
  try {
    const channelId = request.nextUrl.searchParams.get("channelId")

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    console.log(`Retrieving image detection settings for channel ID: ${channelId}`)

    // No validation needed - we accept any channel ID format now
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, originalId, settings } = body

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    if (!settings) {
      return Response.json({ error: "Missing settings" }, { status: 400 })
    }

    console.log(`Saving image detection settings for channel ID: ${channelId}, original ID: ${originalId || "unknown"}`)

    // Validate settings
    const validatedSettings = {
      enabled: Boolean(settings.enabled),
      referenceImageUrl: settings.referenceImageUrl || "",
      similarityThreshold: Math.min(Math.max(Number(settings.similarityThreshold) || 85, 50), 100),
      checkInterval: Math.min(Math.max(Number(settings.checkInterval) || 10, 5), 60),
    }

    // Store the settings using the channel ID as the key
    imageDetectionStore[channelId] = validatedSettings

    // Return the updated store for debugging
    return Response.json({
      success: true,
      settings: imageDetectionStore[channelId],
      channelId,
      originalId,
    })
  } catch (error) {
    console.error("Error saving image detection settings:", error)
    return Response.json(
      {
        error: "Failed to save image detection settings",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Export the store for use in other routes
export { imageDetectionStore }

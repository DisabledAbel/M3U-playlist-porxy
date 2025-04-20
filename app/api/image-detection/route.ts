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
  const channelId = request.nextUrl.searchParams.get("channelId")

  if (!channelId) {
    return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
  }

  try {
    console.log(`Retrieving image detection settings for channel hash: ${channelId}`)

    // No decoding needed - we're using the hash directly
    const settings = imageDetectionStore[channelId] || {
      enabled: false,
      similarityThreshold: 85,
      checkInterval: 10,
    }
    return Response.json({ settings })
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
    const { channelId, originalId, settings } = await request.json()

    if (!channelId) {
      return Response.json({ error: "Missing channelId parameter" }, { status: 400 })
    }

    if (!settings) {
      return Response.json({ error: "Missing settings" }, { status: 400 })
    }

    // Validate settings
    const validatedSettings = {
      enabled: Boolean(settings.enabled),
      referenceImageUrl: settings.referenceImageUrl || "",
      similarityThreshold: Math.min(Math.max(Number(settings.similarityThreshold) || 85, 50), 100),
      checkInterval: Math.min(Math.max(Number(settings.checkInterval) || 10, 5), 60),
    }

    // Store the settings using the hash as the key
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

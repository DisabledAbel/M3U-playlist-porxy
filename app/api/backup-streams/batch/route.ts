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

    const { channels } = body

    if (!Array.isArray(channels)) {
      return Response.json({ error: "Channels must be an array" }, { status: 400 })
    }

    console.log(`Processing batch request for ${channels.length} channels`)
    console.log("Available keys in backupStreamsStore:", Object.keys(backupStreamsStore))

    // Create a results object to store the backup streams for each channel
    const results: Record<string, any[]> = {}

    // Process each channel
    channels.forEach((channel) => {
      const { id } = channel
      if (id) {
        // Log for debugging
        console.log(`Looking up backup streams for channel ID: ${id}`)

        const streams = backupStreamsStore[id] || []
        console.log(`Found ${streams.length} backup streams for channel ID: ${id}`)

        results[id] = streams
      }
    })

    return Response.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error processing batch backup streams request:", error)
    return Response.json(
      {
        error: "Failed to process batch request",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

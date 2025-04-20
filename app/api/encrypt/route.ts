import type { NextRequest } from "next/server"
import { encrypt } from "@/lib/encryption"

// Endpoint to encrypt text on the server side
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")

  if (!text) {
    return Response.json({ error: "Missing text parameter" }, { status: 400 })
  }

  try {
    const encrypted = encrypt(text)
    return Response.json({ encrypted })
  } catch (error) {
    console.error("Encryption error:", error)
    return Response.json(
      {
        error: "Failed to encrypt text",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

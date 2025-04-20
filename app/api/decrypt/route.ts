import type { NextRequest } from "next/server"
import { decrypt } from "@/lib/encryption"

// Endpoint to decrypt text on the server side
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")

  if (!text) {
    return Response.json({ error: "Missing text parameter" }, { status: 400 })
  }

  try {
    const decrypted = decrypt(text)
    return Response.json({ decrypted })
  } catch (error) {
    console.error("Decryption error:", error)
    return Response.json(
      {
        error: "Failed to decrypt text",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

// This endpoint helps debug issues with the proxy
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 })
  }

  try {
    // Fetch the URL and return basic info about it
    const response = await fetch(url, {
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
      },
    })

    // Get headers as an object
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get a preview of the content (first 500 chars)
    let contentPreview = ""
    try {
      const text = await response.text()
      contentPreview = text.substring(0, 500)
    } catch (e) {
      contentPreview = "Could not get content preview"
    }

    return NextResponse.json({
      url,
      status: response.status,
      statusText: response.statusText,
      headers,
      contentPreview,
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch URL",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

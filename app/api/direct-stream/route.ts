import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new Response("Missing URL parameter", { status: 400 })
  }

  console.log("Redirecting to:", url)

  // Simply redirect to the original URL
  return Response.redirect(url)
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a simplified middleware that doesn't actually check authentication
// since our auth is client-side only. In a real app, you would verify
// the session cookie here.

export function middleware(req: NextRequest) {
  // In a real app, you would check for a valid session here
  // For now, we'll just allow all requests
  return NextResponse.next()
}

export const config = {
  matcher: [], // Empty matcher means middleware won't run
}

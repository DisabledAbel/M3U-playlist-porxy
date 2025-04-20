import { type NextRequest, NextResponse } from "next/server"

// This endpoint generates a test M3U playlist for testing the proxy
export async function GET(request: NextRequest) {
  // Create a simple test M3U playlist with various groups
  const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="test1" tvg-name="CNN News" tvg-logo="https://example.com/logo1.png" group-title="News",CNN News
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test2" tvg-name="BBC News" tvg-logo="https://example.com/logo2.png" group-title="News",BBC News
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test3" tvg-name="ESPN Sports" tvg-logo="https://example.com/logo3.png" group-title="Sports",ESPN Sports
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test4" tvg-name="NFL Network" tvg-logo="https://example.com/logo4.png" group-title="Sports",NFL Network
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test5" tvg-name="HBO Movies" tvg-logo="https://example.com/logo5.png" group-title="Movies",HBO Movies
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test6" tvg-name="Netflix Originals" tvg-logo="https://example.com/logo6.png" group-title="Movies",Netflix Originals
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test7" tvg-name="Disney Channel" tvg-logo="https://example.com/logo7.png" group-title="Kids",Disney Channel
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="test8" tvg-name="Cartoon Network" tvg-logo="https://example.com/logo8.png" group-title="Kids",Cartoon Network
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`

  return new NextResponse(playlist, {
    headers: {
      "Content-Type": "application/x-mpegURL",
      "Content-Disposition": "attachment; filename=test-playlist.m3u",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

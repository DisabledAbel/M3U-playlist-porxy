/**
 * Checks if a stream URL is valid and accessible
 * @param url The URL to check
 * @returns A promise that resolves to true if the URL is valid and accessible, false otherwise
 */
export async function checkStreamUrl(url: string): Promise<boolean> {
  try {
    // Try to fetch the stream URL with a HEAD request
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        Range: "bytes=0-0", // Request just the first byte to minimize data transfer
      },
    })

    // If the response is ok, the stream is likely valid
    return response.ok
  } catch (error) {
    console.error(`Error checking stream URL ${url}:`, error)
    return false
  }
}

/**
 * Preloads a video stream to check if it's valid
 * @param url The URL of the stream to preload
 * @returns A promise that resolves to true if the stream is valid, false otherwise
 */
export function preloadStream(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video")

      // Set a timeout to prevent hanging on stream load
      const timeoutId = setTimeout(() => {
        video.removeAttribute("src")
        video.load()
        resolve(false)
      }, 5000) // 5 second timeout

      // Set up event listeners
      video.onloadeddata = () => {
        clearTimeout(timeoutId)
        video.removeAttribute("src")
        video.load()
        resolve(true)
      }

      video.onerror = () => {
        clearTimeout(timeoutId)
        video.removeAttribute("src")
        video.load()
        resolve(false)
      }

      // Start loading the video
      video.src = url
      video.load()
    } catch (error) {
      console.error(`Error preloading stream ${url}:`, error)
      resolve(false)
    }
  })
}

/**
 * Formats a stream URL for display
 * @param url The URL to format
 * @returns A shortened version of the URL for display
 */
export function formatStreamUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const pathname = urlObj.pathname

    // Shorten the pathname if it's too long
    const maxPathLength = 20
    const shortenedPath = pathname.length > maxPathLength ? pathname.substring(0, maxPathLength) + "..." : pathname

    return `${hostname}${shortenedPath}`
  } catch (error) {
    // If the URL is invalid, return a shortened version of the original
    return url.length > 30 ? url.substring(0, 30) + "..." : url
  }
}

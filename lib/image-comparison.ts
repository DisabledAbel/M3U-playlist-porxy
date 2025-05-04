/**
 * Compares two images and returns a similarity score (0-100)
 * @param img1 The first image element
 * @param img2 The second image element
 * @returns A number between 0 and 100 representing the similarity percentage
 */
export async function compareImages(img1: HTMLImageElement, img2: HTMLImageElement): Promise<number> {
  try {
    // Create canvas elements to draw the images
    const canvas1 = document.createElement("canvas")
    const canvas2 = document.createElement("canvas")
    const ctx1 = canvas1.getContext("2d")
    const ctx2 = canvas2.getContext("2d")

    if (!ctx1 || !ctx2) {
      throw new Error("Could not create canvas context")
    }

    // Normalize dimensions - use the smaller of the two images
    const width = Math.min(img1.width, img2.width)
    const height = Math.min(img1.height, img2.height)

    // Set canvas dimensions
    canvas1.width = width
    canvas1.height = height
    canvas2.width = width
    canvas2.height = height

    // Draw images on canvas
    ctx1.drawImage(img1, 0, 0, width, height)
    ctx2.drawImage(img2, 0, 0, width, height)

    // Get image data
    const data1 = ctx1.getImageData(0, 0, width, height).data
    const data2 = ctx2.getImageData(0, 0, width, height).data

    // Compare pixels
    let matchingPixels = 0
    const totalPixels = width * height

    // Sample every 4th pixel for performance (adjust as needed)
    const sampleRate = 4
    let sampledPixels = 0

    for (let i = 0; i < data1.length; i += 4 * sampleRate) {
      sampledPixels++

      // Compare RGB values with some tolerance
      const r1 = data1[i]
      const g1 = data1[i + 1]
      const b1 = data1[i + 2]

      const r2 = data2[i]
      const g2 = data2[i + 1]
      const b2 = data2[i + 2]

      // Calculate color distance (simple Euclidean distance)
      const distance = Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2))

      // Consider pixels similar if distance is below threshold
      const threshold = 30 // Adjust as needed
      if (distance < threshold) {
        matchingPixels++
      }
    }

    // Calculate similarity percentage
    return (matchingPixels / sampledPixels) * 100
  } catch (error) {
    console.error("Error comparing images:", error)
    // Return a default value in case of error
    return 0
  }
}

/**
 * Captures a frame from a video element
 * @param video The video element to capture from
 * @returns An HTMLImageElement containing the captured frame
 */
export function captureVideoFrame(video: HTMLVideoElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas and draw video frame
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not create canvas context"))
        return
      }

      // Draw the current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to image
      const img = new Image()
      img.crossOrigin = "anonymous" // Important for CORS
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = canvas.toDataURL("image/jpeg")
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Loads an image from a URL
 * @param url The URL of the image to load
 * @returns An HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous" // Important for CORS

      // Set a timeout to prevent hanging on image load
      const timeoutId = setTimeout(() => {
        reject(new Error("Image load timed out"))
      }, 10000) // 10 second timeout

      img.onload = () => {
        clearTimeout(timeoutId)
        resolve(img)
      }

      img.onerror = (e) => {
        clearTimeout(timeoutId)
        reject(e)
      }

      img.src = url
    } catch (error) {
      reject(error)
    }
  })
}

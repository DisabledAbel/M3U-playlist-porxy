/**
 * Simple encryption/decryption utility for the M3U playlist proxy
 * This uses a basic XOR cipher with a secret key for simplicity
 */

// This should be a strong, random key in a real application
// In production, this would be an environment variable
const SECRET_KEY = "m3u-proxy-secret-key-2024"

/**
 * Encrypts a string using XOR cipher
 */
export function encrypt(text: string): string {
  if (!text) return ""

  try {
    // Convert text to bytes, apply XOR with key, and convert to base64
    const result = Array.from(text)
      .map((char, index) => {
        // XOR the char code with the corresponding character in the key
        const keyChar = SECRET_KEY[index % SECRET_KEY.length]
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
      })
      .join("")

    // Convert to base64 for URL-safe encoding and replace problematic characters
    return Buffer.from(result, "binary").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  } catch (error) {
    console.error("Encryption error:", error)
    // Return a fallback value in case of error
    return Buffer.from(text).toString("base64")
  }
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ""

  try {
    // Restore base64 standard characters
    const standardBase64 = encryptedText.replace(/-/g, "+").replace(/_/g, "/")

    // Add padding if needed
    const paddedBase64 = standardBase64.padEnd(standardBase64.length + ((4 - (standardBase64.length % 4)) % 4), "=")

    // Convert from base64 back to binary string
    const encryptedBinary = Buffer.from(paddedBase64, "base64").toString("binary")

    // Apply XOR with key to decrypt
    const result = Array.from(encryptedBinary)
      .map((char, index) => {
        // XOR with the same key character used for encryption
        const keyChar = SECRET_KEY[index % SECRET_KEY.length]
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
      })
      .join("")

    return result
  } catch (error) {
    console.error("Decryption error:", error)
    // Try to return the original text decoded from base64 as fallback
    try {
      return Buffer.from(encryptedText, "base64").toString("utf-8")
    } catch {
      return ""
    }
  }
}

/**
 * Encrypts a URL for use in the proxy
 */
export function encryptUrl(url: string): string {
  return encrypt(url)
}

/**
 * Decrypts an encrypted URL
 */
export function decryptUrl(encryptedUrl: string): string {
  return decrypt(encryptedUrl)
}

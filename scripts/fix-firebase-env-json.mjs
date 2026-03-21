/**
 * Dotenv only uses the first line for FIREBASE_SERVICE_ACCOUNT_JSON={ ... }
 * unless the value is quoted. This extracts the full JSON object and rewrites
 * .env.local with a single-line minified value.
 */
import fs from "fs"

const path = new URL("../.env.local", import.meta.url)
const content = fs.readFileSync(path, "utf8")
const startMarker = "FIREBASE_SERVICE_ACCOUNT_JSON="
const idx = content.indexOf(startMarker)
if (idx === -1) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON= not found")
  process.exit(1)
}

let i = idx + startMarker.length
while (i < content.length && (content[i] === " " || content[i] === "\r")) i++
if (content[i] !== "{") {
  console.error("Expected { after FIREBASE_SERVICE_ACCOUNT_JSON=")
  process.exit(1)
}

let depth = 0
const start = i
for (let j = i; j < content.length; j++) {
  const c = content[j]
  if (c === "{") depth++
  else if (c === "}") {
    depth--
    if (depth === 0) {
      const jsonStr = content.slice(start, j + 1)
      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch (e) {
        console.error("Invalid JSON:", e)
        process.exit(1)
      }
      const minified = JSON.stringify(parsed)
      const mongoIdx = content.indexOf("MONGODB_URI", j)
      if (mongoIdx === -1) {
        console.error("MONGODB_URI not found after JSON block")
        process.exit(1)
      }
      const before = content.slice(0, idx)
      let rest = content.slice(mongoIdx)
      rest = rest.replace(/^MONGODB_DB=.*\r?\nMONGODB_DB=/m, "MONGODB_DB=")
      const newContent = `${before}${startMarker}${minified}\n\n${rest}`
      fs.writeFileSync(path, newContent)
      console.log("Updated .env.local: FIREBASE_SERVICE_ACCOUNT_JSON is now one line.")
      process.exit(0)
    }
  }
}

console.error("Unclosed JSON object in FIREBASE_SERVICE_ACCOUNT_JSON")
process.exit(1)

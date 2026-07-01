// Generates the WineSnob app icons (gold wine glass on noir) as PNGs, using
// only Node's built-in zlib. Run: node scripts/gen-icons.mjs
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(OUT, { recursive: true })

const NOIR = [26, 23, 20] // #1A1714
const GOLD = [200, 162, 76] // #C8A24C

// Coverage of the wine-glass mark at fractional coords (0..1).
function inGlass(fx, fy) {
  const cx = 0.5
  // bowl: a tulip/goblet — wide rim at top, convex sides tapering to the stem
  const top = 0.17
  const bot = 0.54
  if (fy >= top && fy <= bot) {
    const t = (bot - fy) / (bot - top) // 1 at the rim, 0 where it meets the stem
    const w = 0.185 * Math.pow(t, 0.6) // half-width; power < 1 = rounded (convex) sides
    if (Math.abs(fx - cx) <= w) return true
  }
  // stem
  if (fx >= cx - 0.02 && fx <= cx + 0.02 && fy >= 0.52 && fy <= 0.8) return true
  // foot
  if (fy >= 0.79 && fy <= 0.83 && fx >= cx - 0.16 && fx <= cx + 0.16) return true
  return false
}

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function png(size) {
  const SS = 3 // supersample for anti-aliasing
  const raw = Buffer.alloc(size * (1 + size * 3))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++)
          if (inGlass((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)) hits++
      const cov = hits / (SS * SS)
      for (let c = 0; c < 3; c++) raw[o++] = Math.round(NOIR[c] * (1 - cov) + GOLD[c] * cov)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
]) {
  writeFileSync(join(OUT, name), png(size))
  console.log('wrote', name, size)
}

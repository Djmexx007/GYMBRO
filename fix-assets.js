// Regenerates all Expo PNG assets using only Node.js built-ins
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([t, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // raw scanlines: filter byte (0) + RGB per pixel
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 3);
    raw[row] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const p = row + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 1 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const ASSETS_DIR = path.join(__dirname, 'assets');

const files = [
  { name: 'icon.png',          w: 1024, h: 1024, r: 255, g: 107, b: 0   }, // orange
  { name: 'adaptive-icon.png', w: 1024, h: 1024, r: 255, g: 107, b: 0   }, // orange
  { name: 'splash.png',        w: 1024, h: 1024, r: 10,  g: 10,  b: 10  }, // near-black
  { name: 'favicon.png',       w: 48,   h: 48,   r: 255, g: 107, b: 0   }, // orange
];

for (const { name, w, h, r, g, b } of files) {
  const out = path.join(ASSETS_DIR, name);
  fs.writeFileSync(out, makePNG(w, h, r, g, b));
  console.log(`✅ ${name} (${w}×${h})`);
}
console.log('Done — run "npx expo start" again.');

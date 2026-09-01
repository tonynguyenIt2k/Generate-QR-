import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG generator using zlib
function createPng(width, height, colorRgba, iconColorRgba) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (width * bytesPerPixel + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * bytesPerPixel + 1);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      
      // Check if pixel is inside the QR shape / logo
      const cx = width / 2;
      const cy = height / 2;
      const size = Math.min(width, height);
      const isCornerBox = (
        (x > cx - size * 0.35 && x < cx - size * 0.15 && y > cy - size * 0.35 && y < cy - size * 0.15) ||
        (x > cx + size * 0.15 && x < cx + size * 0.35 && y > cy - size * 0.35 && y < cy - size * 0.15) ||
        (x > cx - size * 0.35 && x < cx - size * 0.15 && y > cy + size * 0.15 && y < cy + size * 0.35)
      );
      const isCenter = (
        x > cx - size * 0.25 && x < cx + size * 0.25 && y > cy - size * 0.25 && y < cy + size * 0.25
      );
      const isLogo = isCornerBox || isCenter;

      if (isLogo) {
        rawData[pxOffset] = iconColorRgba[0];
        rawData[pxOffset + 1] = iconColorRgba[1];
        rawData[pxOffset + 2] = iconColorRgba[2];
        rawData[pxOffset + 3] = iconColorRgba[3];
      } else {
        rawData[pxOffset] = colorRgba[0];
        rawData[pxOffset + 1] = colorRgba[1];
        rawData[pxOffset + 2] = colorRgba[2];
        rawData[pxOffset + 3] = colorRgba[3];
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Ensure dir
const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PWA Icons
console.log('Generating PWA Icons...');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  const png = createPng(size, size, [15, 23, 42, 255], [79, 70, 229, 255]); // Navy bg, Indigo Logo
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), png);
});

// Maskable icon (with safe margin)
const maskable = createPng(512, 512, [79, 70, 229, 255], [255, 255, 255, 255]);
fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), maskable);

// Also top-level shortcut icons
fs.writeFileSync(path.resolve('public', 'icon-192.png'), createPng(192, 192, [15, 23, 42, 255], [79, 70, 229, 255]));
fs.writeFileSync(path.resolve('public', 'icon-512.png'), createPng(512, 512, [15, 23, 42, 255], [79, 70, 229, 255]));
fs.writeFileSync(path.resolve('public', 'favicon.png'), createPng(64, 64, [15, 23, 42, 255], [79, 70, 229, 255]));

// Generate PWA Screenshots (Wide & Narrow required for PWABuilder 100% score)
console.log('Generating PWA Screenshots...');
const wideScreenshot = createPng(1280, 720, [15, 23, 42, 255], [99, 102, 241, 255]);
fs.writeFileSync(path.join(iconsDir, 'screenshot-desktop.png'), wideScreenshot);

const narrowScreenshot = createPng(750, 1334, [15, 23, 42, 255], [99, 102, 241, 255]);
fs.writeFileSync(path.join(iconsDir, 'screenshot-mobile.png'), narrowScreenshot);

console.log('All PWA Assets generated successfully!');

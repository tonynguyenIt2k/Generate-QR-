const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // standard filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte (0 = None) at beginning of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a !== undefined ? a : 255;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Color helpers
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

function lerpColor(c1, c2, t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Distance to rounded rectangle
function distToRoundRect(px, py, rx, ry, rw, rh, rad) {
  const dx = Math.max(Math.abs(px - (rx + rw / 2)) - (rw / 2 - rad), 0);
  const dy = Math.max(Math.abs(py - (ry + rh / 2)) - (rh / 2 - rad), 0);
  return Math.sqrt(dx * dx + dy * dy) - rad;
}

// Icon renderer
function drawIcon(x, y, w, h, isMaskable) {
  const u = x / w;
  const v = y / h;

  // Background gradient: Electric Blue -> Indigo -> Deep Slate
  const gradT = (u * 0.5 + v * 0.85);
  let bgRgb;
  if (gradT < 0.5) {
    bgRgb = lerpColor([59, 130, 246], [79, 70, 229], gradT * 2);
  } else {
    bgRgb = lerpColor([79, 70, 229], [30, 27, 75], (gradT - 0.5) * 2);
  }

  // If not maskable, round outer corners (squircle)
  if (!isMaskable) {
    const outerDist = distToRoundRect(x, y, 0, 0, w, h, w * 0.22);
    if (outerDist > 1) return [0, 0, 0, 0]; // Transparent outside
    if (outerDist > 0) {
      const alpha = Math.round(255 * (1 - outerDist));
      return [...bgRgb, alpha];
    }
  }

  // Subtle top radial glow
  const glowDist = Math.hypot(x - w * 0.5, y - h * 0.1) / (w * 0.6);
  if (glowDist < 1) {
    const glowAmt = (1 - glowDist) * 0.35;
    bgRgb = lerpColor(bgRgb, [96, 165, 250], glowAmt);
  }

  // Inner White Label Card (Sticker)
  // Maskable uses safer padding: 24% to 76%, non-maskable uses 17% to 83%
  const cardPad = isMaskable ? 0.23 : 0.17;
  const cardX = w * cardPad;
  const cardY = h * cardPad;
  const cardW = w * (1 - 2 * cardPad);
  const cardH = h * (1 - 2 * cardPad);
  const cardRad = cardW * 0.14;

  const cardDist = distToRoundRect(x, y, cardX, cardY, cardW, cardH, cardRad);

  // Drop shadow for card
  const shadowDist = distToRoundRect(x, y, cardX, cardY + cardH * 0.04, cardW, cardH, cardRad);
  if (cardDist > 0 && shadowDist <= cardW * 0.08) {
    const shadowT = Math.max(0, 1 - shadowDist / (cardW * 0.08));
    bgRgb = lerpColor(bgRgb, [15, 23, 42], shadowT * 0.45);
  }

  if (cardDist > 0) {
    return [...bgRgb, 255];
  }

  // Inside Card! Base color is pure clean white
  let cardColor = [255, 255, 255];

  // Ribbon banner at the top of the card (approx top 16% of card)
  const ribbonH = cardH * 0.17;
  if (y < cardY + ribbonH) {
    // Blue banner
    cardColor = [37, 99, 235];
    // Barcode stripes in ribbon
    const rx = (x - cardX) / cardW;
    if (rx >= 0.10 && rx <= 0.42) {
      const stripeIdx = Math.floor((rx - 0.10) * 40);
      if ([1, 2, 4, 7, 8, 9, 11, 13, 14].includes(stripeIdx)) {
        cardColor = [255, 255, 255];
      }
    }
    return [...cardColor, 255];
  }

  // Separator line below ribbon
  if (Math.abs(y - (cardY + ribbonH)) <= Math.max(1, cardH * 0.008)) {
    return [30, 64, 175, 255];
  }

  // QR Code Area inside the card
  const qrPad = cardW * 0.10;
  const qrX = cardX + qrPad;
  const qrY = cardY + ribbonH + cardPad * 0.7;
  const qrW = cardW - 2 * qrPad;
  const qrH = cardH - ribbonH - cardPad * 1.5;

  const qx = (x - qrX) / qrW;
  const qy = (y - qrY) / qrH;

  if (qx >= 0 && qx <= 1 && qy >= 0 && qy <= 1) {
    // Finder eye 1: Top-Left (0.0 to 0.35, 0.0 to 0.35)
    // Finder eye 2: Top-Right (0.65 to 1.0, 0.0 to 0.35)
    // Finder eye 3: Bottom-Left (0.0 to 0.35, 0.65 to 1.0)
    function inFinderEye(fx, fy) {
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
      // Outer square (0 to 1)
      const border = 0.18;
      if (fx < border || fx > 1 - border || fy < border || fy > 1 - border) {
        return [15, 23, 42]; // Dark slate outer ring
      }
      // White gap
      const inner = 0.32;
      if (fx < inner || fx > 1 - inner || fy < inner || fy > 1 - inner) {
        return [255, 255, 255]; // White spacer
      }
      // Inner center dot
      return 'accent';
    }

    // Check TL
    const tl = inFinderEye(qx / 0.36, qy / 0.36);
    if (tl) {
      return tl === 'accent' ? [16, 185, 129, 255] : [...tl, 255]; // Emerald
    }

    // Check TR
    const tr = inFinderEye((qx - 0.64) / 0.36, qy / 0.36);
    if (tr) {
      return tr === 'accent' ? [37, 99, 235, 255] : [...tr, 255]; // Blue
    }

    // Check BL
    const bl = inFinderEye(qx / 0.36, (qy - 0.64) / 0.36);
    if (bl) {
      return bl === 'accent' ? [99, 102, 241, 255] : [...bl, 255]; // Indigo
    }

    // Center Module Accent Badge
    if (qx >= 0.42 && qx <= 0.58 && qy >= 0.42 && qy <= 0.58) {
      const centerDist = Math.hypot(qx - 0.5, qy - 0.5);
      if (centerDist < 0.035) return [255, 255, 255, 255];
      return [14, 165, 233, 255]; // Sky blue
    }

    // Data dots matrix (grid 7x7)
    const col = Math.floor(qx * 11);
    const row = Math.floor(qy * 11);

    // Some dark blocks for authentic QR pattern
    const isDark = (
      (col === 4 && (row % 2 === 0)) ||
      (row === 4 && (col % 2 === 0)) ||
      (col === 6 && row >= 5) ||
      (col >= 7 && row === 5) ||
      (col >= 7 && row >= 7 && ((col + row) % 2 === 0)) ||
      (col === 8 && row === 8) ||
      (col === 10 && row >= 7)
    );

    if (isDark) {
      if (col >= 7 && row >= 7) {
        return [59, 130, 246, 255]; // Modern blue accents
      }
      return [15, 23, 42, 255]; // Dark slate
    }
  }

  return [...cardColor, 255];
}

// Generate all standard PWA / iOS / Web icons
const iconsToGenerate = [
  { w: 64, h: 64, path: 'public/favicon.png', maskable: false },
  { w: 72, h: 72, path: 'public/icons/icon-72x72.png', maskable: false },
  { w: 96, h: 96, path: 'public/icons/icon-96x96.png', maskable: false },
  { w: 128, h: 128, path: 'public/icons/icon-128x128.png', maskable: false },
  { w: 144, h: 144, path: 'public/icons/icon-144x144.png', maskable: false },
  { w: 152, h: 152, path: 'public/icons/icon-152x152.png', maskable: false },
  { w: 180, h: 180, path: 'public/apple-touch-icon.png', maskable: false },
  { w: 192, h: 192, path: 'public/icon-192.png', maskable: false },
  { w: 192, h: 192, path: 'public/icons/icon-192x192.png', maskable: false },
  { w: 384, h: 384, path: 'public/icons/icon-384x384.png', maskable: false },
  { w: 512, h: 512, path: 'public/icon-512.png', maskable: false },
  { w: 512, h: 512, path: 'public/icons/icon-512x512.png', maskable: false },
  { w: 512, h: 512, path: 'public/icons/maskable-icon-512x512.png', maskable: true },
];

console.log('Generating pixel-perfect PNG icons...');

iconsToGenerate.forEach(({ w, h, path: outPath, maskable }) => {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pngBuf = createPng(w, h, (x, y) => drawIcon(x, y, w, h, maskable));
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated: ${outPath} (${w}x${h}, size: ${pngBuf.length} bytes, header: ${pngBuf.slice(0, 8).toString('hex')})`);
});

console.log('ALL ICONS GENERATED SUCCESSFULLY!');

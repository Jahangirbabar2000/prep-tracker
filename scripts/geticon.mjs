// Generates every app icon from one mark: a two-card deck — a teal card angled
// behind a gold one — in the Gilded palette. Colors are copied from the dark
// theme in app/globals.css (--bg / --surface-2 / --accent / --accent-2); if
// those tokens change, change them here too.
//
//   node scripts/geticon.mjs
//
// Outputs:
//   app/icon.svg        vector, what Chrome uses for the tab (crisp at any size)
//   app/favicon.ico     16/32/48 raster fallback
//   public/icon-*.png   PWA/home-screen, drawn maskable-safe (see below)
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const INK = '#141009';   // --bg dark
const INK2 = '#2a2114';  // --surface-2 dark
const GOLD = '#e6bd57';  // --accent dark
const GOLD2 = '#f2ce77'; // --accent-h dark
const TEAL = '#2dd4bf';  // --accent-2 dark

const defs = `
    <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK2}"/><stop offset="1" stop-color="${INK}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${GOLD2}"/><stop offset="1" stop-color="${GOLD}"/>
    </linearGradient>`;

// The mark itself, in a 512 box. The ink rect under the gold card is a keyline:
// it separates the two cards so the deck still reads as two cards at 16px.
// components/Logo.tsx draws the same shapes as JSX for in-app use — keep the
// two in sync.
const art = `
  <g transform="rotate(-16 256 256)"><rect x="90" y="108" width="240" height="304" rx="36" fill="${TEAL}"/></g>
  <rect x="166" y="90" width="256" height="322" rx="40" fill="${INK}"/>
  <rect x="178" y="102" width="232" height="298" rx="32" fill="url(#gold)"/>
  <rect x="212" y="182" width="164" height="38" rx="19" fill="${INK}"/>
  <rect x="212" y="258" width="102" height="38" rx="19" fill="${INK}"/>`;

// Tab/app icon: rounded plate, art full size. Nothing crops this one.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" rx="114" fill="url(#plate)"/>${art}
</svg>`;

// Maskable icon: square full-bleed plate (the launcher applies its own shape)
// with the art scaled to 80% so it survives the maskable safe zone — Android
// may crop up to 20% off each edge, leaving only the centre circle guaranteed.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" fill="url(#plate)"/>
  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">${art}</g>
</svg>`;

writeFileSync('app/icon.svg', icon + '\n');
await sharp(Buffer.from(maskable)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/icon-512.png');

// favicon.ico — an ICO is a header plus one directory entry per size; modern
// browsers accept PNG-encoded entries, so each size is just a PNG blob.
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map(s => sharp(Buffer.from(icon)).resize(s, s).png().toBuffer()),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);           // reserved
header.writeUInt16LE(1, 2);           // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);                 // width
  e.writeUInt8(s, 1);                 // height
  e.writeUInt8(0, 2);                 // palette size (0 = truecolor)
  e.writeUInt8(0, 3);                 // reserved
  e.writeUInt16LE(1, 4);              // color planes
  e.writeUInt16LE(32, 6);             // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync('app/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));

console.log('wrote app/icon.svg, app/favicon.ico, public/icon-192.png, public/icon-512.png');

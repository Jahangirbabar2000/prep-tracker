import sharp from 'sharp';

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#221a52"/>
      <stop offset="1" stop-color="#0c0a1a"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#16a34a"/>
      <stop offset="1" stop-color="#4ade80"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="150" y="266" width="54" height="104" rx="18" fill="url(#bar)" opacity="0.5"/>
  <rect x="229" y="210" width="54" height="160" rx="18" fill="url(#bar)" opacity="0.78"/>
  <rect x="308" y="150" width="54" height="220" rx="18" fill="url(#bar)"/>
  <circle cx="335" cy="118" r="17" fill="#86efac"/>
</svg>`;

const buf = Buffer.from(svg);
await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png');
console.log('icons written');

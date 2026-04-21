import fs from 'fs';
import zlib from 'zlib';

const protoDir = 'C:/Users/robot/BNR/리더스아이 개발 - 문서/94. CheckReading gitbook Manual/prototype';

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data: each row = filter(0) + size*3 bytes
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter type none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const rawData = Buffer.concat(Array(size).fill(row));
  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// #1d4ed8 = rgb(29, 78, 216)
for (const size of [192, 512]) {
  const png = createPNG(size, 29, 78, 216);
  fs.writeFileSync(`${protoDir}/icon-${size}.png`, png);
  console.log(`icon-${size}.png created`);
}

// Also keep SVG for manifest (Android)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="102" fill="#1d4ed8"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial,sans-serif" font-weight="bold" font-size="194" fill="white">CR</text>
</svg>`;
fs.writeFileSync(`${protoDir}/icon.svg`, svg);
console.log('icon.svg created');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGroundCombined } from '../src/art/terrain.js';
import { PixelBuffer } from '../src/art/PixelBuffer.js';
import zlib from 'node:zlib';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'art');
fs.mkdirSync(OUT, { recursive: true });
// 2x2 tiled preview to check seams
const g = makeGroundCombined(512, 7);
const d = { data: new Uint8ClampedArray(512*512*4) };
const W = 512, H = 512;
const out = new PixelBuffer(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((y % 512) * 512 + (x % 512)) * 4;
    out.data[(y * W + x) * 4] = g.data[i]; out.data[(y * W + x) * 4 + 1] = g.data[i + 1];
    out.data[(y * W + x) * 4 + 2] = g.data[i + 2]; out.data[(y * W + x) * 4 + 3] = 255;
    const a = d.data[i + 3] / 255;
    if (a > 0) {
        const o = (y * W + x) * 4;
        out.data[o] = out.data[o] * (1 - a) + d.data[i] * a;
        out.data[o + 1] = out.data[o + 1] * (1 - a) + d.data[i + 1] * a;
        out.data[o + 2] = out.data[o + 2] * (1 - a) + d.data[i + 2] * a;
    }
}
// png encode
const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const tb = Buffer.from(type, 'ascii'); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(Buffer.concat([tb, data]))); return Buffer.concat([len, tb, data, cb]); };
const stride = W * 4; const raw = Buffer.alloc((stride + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (stride + 1)] = 0; Buffer.from(out.data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(path.join(OUT, 'terrain-tiled.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('terrain preview written');

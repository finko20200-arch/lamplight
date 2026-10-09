/**
 * Art QA tool.
 *
 * Renders sprite definitions to PNG contact sheets so every pixel of the game
 * can be reviewed by eye (and iterated on) before shipping.
 *
 *   node tools/art-preview.mjs [--out qa/art] [--scale 4] [--only hero]
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelBuffer } from '../src/art/PixelBuffer.js';
import { encodePNG } from './png.js';
import { SPRITE_GROUPS } from '../src/art/registry.js';

const args = process.argv.slice(2);
const getArg = (name, dflt) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const OUT = getArg('out', 'qa/art');
const SCALE = parseInt(getArg('scale', '4'), 10);
const ONLY = getArg('only', null);
const BG = getArg('bg', 'dark');

fs.mkdirSync(OUT, { recursive: true });

function background(w, h) {
    const b = new PixelBuffer(w, h);
    if (BG === 'dark') {
        b.rect(0, 0, w, h, 0x14101f);
        for (let y = 0; y < h; y += 8) {
            for (let x = (y / 8) % 2 ? 8 : 0; x < w; x += 16) { b.rect(x, y, 8, 8, 0x191428); }
        }
    } else if (BG === 'light') {
        b.rect(0, 0, w, h, 0x9a94a8);
    } else {
        b.rect(0, 0, w, h, 0x000000, 0);
    }
    return b;
}

function upscale(src, scale) {
    const out = new PixelBuffer(src.width * scale, src.height * scale);
    for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            const i = (y * src.width + x) * 4;
            if (src.data[i + 3] === 0) { continue; }
            for (let j = 0; j < scale; j++) {
                for (let k = 0; k < scale; k++) {
                    const o = ((y * scale + j) * out.width + (x * scale + k)) * 4;
                    out.data[o] = src.data[i];
                    out.data[o + 1] = src.data[i + 1];
                    out.data[o + 2] = src.data[i + 2];
                    out.data[o + 3] = src.data[i + 3];
                }
            }
        }
    }
    return out;
}

let totalSprites = 0;

for (const group of SPRITE_GROUPS) {
    if (ONLY && group.name !== ONLY) { continue; }
    const cells = [];
    for (const def of group.sprites) {
        for (let f = 0; f < (def.frames ? def.frames.length || def.frames : 1); f++) {
            const buf = new PixelBuffer(def.w, def.h);
            def.paint(buf, f);
            cells.push({ buf, label: def.frames && Array.isArray(def.frames) ? def.frames[f] : `${def.key}_${f}` });
        }
    }
    if (!cells.length) { continue; }

    const cellW = Math.max(...cells.map(c => c.buf.width));
    const cellH = Math.max(...cells.map(c => c.buf.height));
    const perRow = Math.min(cells.length, Math.max(4, Math.floor(600 / Math.max(cellW, 1))));
    const rows = Math.ceil(cells.length / perRow);
    const padX = 6, padY = 6;

    const sheetW = perRow * (cellW + padX) + padX;
    const sheetH = rows * (cellH + padY) + padY;
    const sheet = background(sheetW, sheetH);

    cells.forEach((c, idx) => {
        const cx = padX + (idx % perRow) * (cellW + padX);
        const cy = padY + Math.floor(idx / perRow) * (cellH + padY);
        // bottom-aligned so animations sit on a common ground line
        sheet.blit(c.buf, cx + Math.floor((cellW - c.buf.width) / 2), cy + (cellH - c.buf.height));
        // ground line
        sheet.hline(cx - 2, cy + cellH + 1, cellW + 4, 0x2a2340);
    });

    const big = upscale(sheet, SCALE);
    const file = path.join(OUT, `${group.name}.png`);
    fs.writeFileSync(file, encodePNG(big.width, big.height, big.data));
    totalSprites += cells.length;
    console.log(`✓ ${group.name.padEnd(16)} ${String(cells.length).padStart(3)} frames  ${sheetW}x${sheetH} -> ${file}`);
}

console.log(`\n${totalSprites} sprite frames rendered.`);

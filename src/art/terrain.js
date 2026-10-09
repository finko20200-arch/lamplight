import { PixelBuffer, hash2 } from './PixelBuffer.js';
import { P, mix } from './palette.js';

/* ══════════════════════════════════════════════════════════════════════
   TERRAIN — seamlessly tiling ground textures for the endless forest.
   Value-noise with a wrapped lattice, so TileSprite can scroll forever
   without a visible seam.
   ══════════════════════════════════════════════════════════════════════ */

const mod = (a, n) => ((a % n) + n) % n;

function smooth(t) { return t * t * (3 - 2 * t); }

/** Periodic value noise: lattice of `period` cells, wraps on both axes. */
function vnoise(x, y, period, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const x0 = mod(xi, period), x1 = mod(xi + 1, period);
    const y0 = mod(yi, period), y1 = mod(yi + 1, period);
    const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
    const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
    return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * yf;
}

/** Fractal sum, still seamless (each octave's lattice wraps exactly at the tile edge). */
function fbm(x, y, size, seed, octaves = 4, baseScale = 4) {
    let v = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < octaves; o++) {
        const scale = baseScale / Math.pow(2, o);   // px per lattice cell
        const period = Math.max(2, Math.round(size / scale)); // lattice cells per tile
        v += vnoise(x / scale, y / scale, period, seed + o * 101) * amp;
        norm += amp;
        amp *= 0.5;
    }
    return v / norm;
}

/** Draw a primitive repeated over the 3x3 wrap neighbourhood (seamless tiles). */
function wrapEach(size, x, y, fn) {
    for (let ox = -size; ox <= size; ox += size) {
        for (let oy = -size; oy <= size; oy += size) { fn(x + ox, y + oy); }
    }
}

/**
 * Forest floor: mossy earth, damp patches, pebbles, twigs, leaf litter.
 * size must be a multiple of 4.
 */
export function makeGround(size = 256, seed = 7) {
    const buf = new PixelBuffer(size, size);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const n1 = fbm(x, y, size, seed, 4, 4);             // broad mottling
            const n2 = fbm(x, y, size, seed + 31, 3, 2);      // fine grain
            const n3 = fbm(x, y, size, seed + 77, 2, 8);      // damp patches

            let t = (n1 - 0.32) * 2.2;
            t = Math.max(0, Math.min(1, t * 0.7 + n2 * 0.35));

            // base: night moss → dirt, kept dark and moody
            let c = mix(P.moss[0], P.dirt[0], t);
            c = mix(c, P.moss[1], Math.max(0, (n1 - 0.5) * 1.5));
            c = mix(c, P.night[0], Math.max(0, (0.46 - n3) * 2.0));      // damp dark hollows
            c = mix(c, P.dirt[1], Math.max(0, (n2 - 0.72) * 1.2));       // dry dusty bits

            // cold ambient tint in the shadows
            c = mix(c, P.night[1], 0.34);
            // global night exposure
            c = [c[0] * 0.82, c[1] * 0.84, c[2] * 0.92];

            // pixel grain
            const g = (hash2(x, y, seed + 5) - 0.5) * 0.10;
            buf.set(x, y, [
                Math.max(0, Math.min(255, c[0] * (1 + g))),
                Math.max(0, Math.min(255, c[1] * (1 + g))),
                Math.max(0, Math.min(255, c[2] * (1 + g)))
            ]);
        }
    }

    // ── pebbles ──
    for (let i = 0; i < Math.round(size * size / 2600); i++) {
        const x = Math.floor(hash2(i, 3, seed) * size);
        const y = Math.floor(hash2(i, 9, seed + 1) * size);
        const r = 1 + hash2(i, 15, seed + 2);
        const c = mix(P.stone[1], P.dirt[2], hash2(i, 21, seed));
        wrapEach(size, x, y, (X, Y) => {
            buf.ellipse(X, Y, r * 1.3, r, c);
            buf.set(X - 1, Y - 1, mix(P.stone[2], c, 0.4));
            buf.set(X + 1, Y + 1, mix(P.stone[0], c, 0.5), 0.8);
        });
    }

    // ── grass tufts ──
    for (let i = 0; i < Math.round(size * size / 5200); i++) {
        const x = Math.floor(hash2(i, 33, seed + 7) * size);
        const y = Math.floor(hash2(i, 41, seed + 11) * size);
        const blades = 3 + Math.floor(hash2(i, 47, seed) * 3);
        for (let b = 0; b < blades; b++) {
            const h = 2 + Math.round(hash2(i, b + 53, seed) * 3);
            const dx = Math.round((hash2(i, b + 61, seed) - 0.5) * 3);
            const col = b % 2 ? P.moss[2] : P.moss[1];
            for (let k = 0; k < h; k++) {
                buf.set(mod(x + b * 2 - blades + Math.round(dx * (k / h)), size), mod(y - k, size), col, 0.85);
            }
        }
    }

    // ── twigs ──
    for (let i = 0; i < Math.round(size * size / 12000); i++) {
        const x = Math.floor(hash2(i, 71, seed + 3) * size);
        const y = Math.floor(hash2(i, 73, seed + 5) * size);
        const len = 3 + Math.floor(hash2(i, 79, seed) * 5);
        const ang = hash2(i, 83, seed) * 3.14;
        wrapEach(size, x, y, (X, Y) => {
            for (let k = 0; k < len; k++) {
                buf.set(X + Math.round(Math.cos(ang) * k), Y + Math.round(Math.sin(ang) * k), P.wood[1], 0.8);
            }
        });
    }

    // ── leaf litter ──
    for (let i = 0; i < Math.round(size * size / 9000); i++) {
        const x = Math.floor(hash2(i, 89, seed + 13) * size);
        const y = Math.floor(hash2(i, 97, seed + 17) * size);
        const c = hash2(i, 101, seed) < 0.4 ? mix(P.wood[2], P.dirt[2], 0.5) : mix(P.moss[1], P.dirt[1], 0.4);
        wrapEach(size, x, y, (X, Y) => buf.ellipse(X, Y, 1.8, 1.1, c, true, 0.85));
    }

    return buf;
}

/**
 * FINAL floor texture: base + detail baked into ONE seamless 512x512 layer
 * (removes parallax moire and halves tile repetition visibility).
 */
export function makeGroundCombined(size = 512, seed = 7) {
    const base = makeGround(size, seed);
    const det = makeGroundDetail(size, seed + 12);
    for (let i = 0; i < base.data.length; i += 4) {
        const a = det.data[i + 3] / 255;
        if (a > 0) {
            base.data[i] = base.data[i] * (1 - a) + det.data[i] * a;
            base.data[i + 1] = base.data[i + 1] * (1 - a) + det.data[i + 1] * a;
            base.data[i + 2] = base.data[i + 2] * (1 - a) + det.data[i + 2] * a;
        }
    }
    return base;
}

/**
 * Sparse detail overlay (roots, moss carpets, stones, tiny glowing spores).
 * Drawn on a second TileSprite with a slightly different scroll speed so the
 * floor reads as two layers of depth instead of a flat bitmap.
 */
export function makeGroundDetail(size = 256, seed = 19) {
    const buf = new PixelBuffer(size, size);

    // moss carpets
    for (let i = 0; i < 26; i++) {
        const x = hash2(i, 3, seed) * size;
        const y = hash2(i, 7, seed + 1) * size;
        const r = 8 + hash2(i, 11, seed) * 18;
        for (let j = 0; j < r * r * 0.5; j++) {
            const a = hash2(i, j, seed + 3) * 6.283;
            const rr = Math.sqrt(hash2(i, j, seed + 5)) * r;
            const px = mod(Math.round(x + Math.cos(a) * rr), size);
            const py = mod(Math.round(y + Math.sin(a) * rr), size);
            buf.set(px, py, hash2(i, j, seed) < 0.5 ? P.moss[1] : P.moss[2], 0.35);
        }
    }

    // root networks
    for (let i = 0; i < 9; i++) {
        let x = hash2(i, 23, seed) * size;
        let y = hash2(i, 29, seed + 2) * size;
        let ang = hash2(i, 31, seed) * 6.283;
        const len = 40 + Math.floor(hash2(i, 37, seed) * 70);
        for (let k = 0; k < len; k++) {
            ang += (hash2(i, k, seed + 9) - 0.5) * 0.5;
            x = mod(x + Math.cos(ang), size);
            y = mod(y + Math.sin(ang), size);
            const w = k < 10 ? 2 : 1;
            for (let o = -w; o <= w; o++) {
                buf.set(mod(Math.round(x + Math.cos(ang + 1.57) * o), size), mod(Math.round(y + Math.sin(ang + 1.57) * o), size),
                    o === 0 ? P.wood[1] : P.wood[0], 0.75);
            }
        }
    }

    // small stones
    for (let i = 0; i < 40; i++) {
        const x = hash2(i, 43, seed + 4) * size;
        const y = hash2(i, 47, seed + 6) * size;
        const r = 1.4 + hash2(i, 53, seed) * 2.2;
        wrapEach(size, Math.round(x), Math.round(y), (X, Y) => {
            buf.ellipse(X, Y, r * 1.2, r * 0.9, P.stone[1], true, 0.8);
            buf.set(X - Math.round(r * 0.4), Y - Math.round(r * 0.4), P.stone[2], 0.7);
            buf.set(X + Math.round(r * 0.5), Y + Math.round(r * 0.4), P.stone[0], 0.7);
        });
    }

    // glowing spore dots (bloom bait)
    for (let i = 0; i < 22; i++) {
        const x = Math.round(hash2(i, 59, seed + 8) * size);
        const y = Math.round(hash2(i, 61, seed + 10) * size);
        const c = i % 3 === 0 ? P.cyan[2] : P.ghost[2];
        wrapEach(size, x, y, (X, Y) => {
            buf.set(X, Y, c, 0.85);
            buf.set(X + 1, Y, c, 0.35);
            buf.set(X, Y + 1, c, 0.35);
            buf.set(X - 1, Y, c, 0.25);
            buf.set(X, Y - 1, c, 0.25);
        });
    }

    return buf;
}

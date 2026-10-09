import { PixelBuffer, hash2 } from './PixelBuffer.js';
import { INK, P, mix } from './palette.js';

/**
 * Shared art helpers. Every sprite in the game goes through `finish()` so the
 * whole cast shares one outline colour, one light direction and one grain.
 */

export const LIGHT_DIR = [-0.4, -1];          // moonlight from above (slightly left)
export const RIM_LIGHT = 0xb9c6ff;            // cold moonlight rim — separates
                                              // every silhouette from the dark floor
export const RIM_SHADOW = 0x0b0816;           // deep ambient shadow underneath

/**
 * Standard post-processing for character/prop sprites.
 */
export function finish(buf, opts = {}) {
    const {
        outline = INK,
        rimLight = RIM_LIGHT,
        rimShadow = RIM_SHADOW,
        lightAmount = 0.55,
        shadowAmount = 0.62,
        grain = 0.05,
        seed = 3,
        skipRim = false,
        skipOutline = false
    } = opts;

    if (!skipRim) {
        buf.rim(LIGHT_DIR[0], LIGHT_DIR[1], rimLight, rimShadow, lightAmount, shadowAmount);
    }
    if (grain > 0) { buf.grain(grain, seed); }
    if (!skipOutline) { buf.outline(outline); }
    return buf;
}

/** Soft round sprite used for glows, lights and particles. */
export function softDot(size = 32, color = 0xffffff, falloff = 2.2) {
    const b = new PixelBuffer(size, size);
    const c = size / 2 - 0.5;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = Math.hypot(x - c, y - c) / (size / 2);
            let a = Math.max(0, 1 - d);
            a = Math.pow(a, falloff);
            if (a > 0.004) { b.set(x, y, color, a); }
        }
    }
    return b;
}

/** Radial ring (shockwaves, novas). */
export function ringSprite(size, thickness, color, opts = {}) {
    const { inner = 0xffffff, soft = 0.5 } = opts;
    const b = new PixelBuffer(size, size);
    const c = size / 2 - 0.5, r = size / 2 - 1;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = Math.hypot(x - c, y - c);
            const t = Math.abs(d - r) / thickness;
            if (t < 1) {
                const a = Math.pow(1 - t, 1 + soft);
                b.set(x, y, t < 0.35 && inner ? inner : color, a);
            }
        }
    }
    return b;
}

/** Ground shadow puddle under entities. */
export function shadowSprite(w, h, strength = 0.5) {
    const b = new PixelBuffer(w, h);
    const cx = w / 2 - 0.5, cy = h / 2 - 0.5;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2));
            const a = Math.max(0, 1 - d);
            if (a > 0) { b.set(x, y, 0x05030a, Math.pow(a, 1.7) * strength); }
        }
    }
    return b;
}

/** Flat-ish blob with a lighter top and darker bottom (smoke, fire, goo). */
export function puff(size, colors, seed = 1, jitter = 0.22) {
    const b = new PixelBuffer(size, size);
    const c = size / 2;
    b.blob(c, c, c * 0.82, c * 0.78, colors[1], { seed, jitter, lobes: 4 });
    b.blob(c - size * 0.12, c - size * 0.14, c * 0.5, c * 0.46, colors[2] || colors[1], { seed: seed + 5, jitter: jitter * 1.4, lobes: 3 });
    b.blob(c + size * 0.1, c + size * 0.16, c * 0.42, c * 0.34, colors[0], { seed: seed + 9, jitter: jitter * 1.2, lobes: 3 });
    return b;
}

/** Small utility: draw a vertical "body" shape used by many creatures. */
export function bodyShape(buf, cx, top, bottom, widthTop, widthBottom, color, seed = 1) {
    for (let y = top; y <= bottom; y++) {
        const t = (y - top) / Math.max(1, bottom - top);
        const w = widthTop + (widthBottom - widthTop) * t;
        const wob = (hash2(y, seed, seed) - 0.5) * 1.2;
        const hw = w / 2 + wob * 0.4;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            buf.set(x, y, color);
        }
    }
    return buf;
}

/** Two glowing eyes with a bright core pixel. */
export function eyes(buf, x, y, gap, color, core = 0xffffff, size = 1) {
    for (let i = -size; i <= size; i++) {
        buf.set(x + i, y, color);
        buf.set(x + gap + i, y, color);
    }
    buf.set(x, y, core);
    buf.set(x + gap, y, core);
    buf.set(x, y - 1, color, 0.6);
    buf.set(x + gap, y - 1, color, 0.6);
    return buf;
}

/** Deterministic "hand-placed" detail speckles. */
export function speckle(buf, x, y, w, h, color, density = 0.14, seed = 11, alpha = 1) {
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if (hash2(x + i, y + j, seed) < density && buf.alphaAt(x + i, y + j) > 0) {
                buf.set(x + i, y + j, color, alpha);
            }
        }
    }
    return buf;
}

/** Dithered transition between two areas of an existing shape. */
export function ditherEdge(buf, colorA, colorB, axis = 'y', ratio = 0.5) {
    for (let y = 0; y < buf.height; y++) {
        for (let x = 0; x < buf.width; x++) {
            if (buf.alphaAt(x, y) === 0) { continue; }
            const t = axis === 'y' ? y / buf.height : x / buf.width;
            const th = ((y % 4) * 4 + (x % 4));
            const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][th];
            if (Math.abs(t - ratio) < 0.18 && bayer / 16 < 0.5) {
                buf.set(x, y, mix(colorA, colorB, bayer / 16), 1);
            }
        }
    }
    return buf;
}

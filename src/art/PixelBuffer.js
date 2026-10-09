/**
 * PixelBuffer — renderer-agnostic RGBA pixel surface.
 *
 * The same buffer is used:
 *   • in the browser (written into an ImageData -> canvas -> Phaser texture)
 *   • in Node (encoded to PNG by tools/png.js for art QA previews)
 *
 * Everything is integer-pixel based: no anti-aliasing, no float coordinates.
 */

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/** Parse a colour into [r,g,b] — accepts 0xRRGGBB, '#rgb', '#rrggbb' or [r,g,b]. */
export function toRGB(color) {
    if (Array.isArray(color)) { return color; }
    if (typeof color === 'number') {
        return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
    }
    if (typeof color === 'string') {
        let s = color.replace('#', '');
        if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
        const n = parseInt(s, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return [255, 0, 255];
}

/** Deterministic tiny hash RNG (0..1) — same input, same output, everywhere. */
export function hash2(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695040888963407) | 0;
    h = (h ^ (h >>> 13)) | 0;
    h = (h * 1274126177) | 0;
    h = (h ^ (h >>> 16)) | 0;
    return ((h >>> 0) % 100000) / 100000;
}

export class PixelBuffer {
    constructor(width, height) {
        this.width = width | 0;
        this.height = height | 0;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }

    get pixels() { return this.width * this.height; }

    clear() {
        this.data.fill(0);
        return this;
    }

    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    alphaAt(x, y) {
        if (!this.inBounds(x, y)) { return 0; }
        return this.data[(y * this.width + x) * 4 + 3];
    }

    getPixel(x, y) {
        if (!this.inBounds(x, y)) { return null; }
        const i = (y * this.width + x) * 4;
        return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
    }

    /** Set a single pixel. `alpha` 0..1. */
    set(x, y, color, alpha = 1) {
        x = x | 0; y = y | 0;
        if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) { return this; }
        const [r, g, b] = toRGB(color);
        const i = (y * this.width + x) * 4;
        if (alpha >= 1) {
            this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
        } else {
            const ia = 1 - alpha;
            const da = this.data[i + 3] / 255;
            const oa = alpha + da * ia;
            if (oa <= 0) { return this; }
            this.data[i] = clamp255((r * alpha + this.data[i] * da * ia) / oa);
            this.data[i + 1] = clamp255((g * alpha + this.data[i + 1] * da * ia) / oa);
            this.data[i + 2] = clamp255((b * alpha + this.data[i + 2] * da * ia) / oa);
            this.data[i + 3] = clamp255(oa * 255);
        }
        return this;
    }

    /** Blend a colour onto an existing pixel by `amount` (keeps alpha). */
    blend(x, y, color, amount = 1) {
        x = x | 0; y = y | 0;
        if (!this.inBounds(x, y) || this.data[(y * this.width + x) * 4 + 3] === 0) { return this; }
        const [r, g, b] = toRGB(color);
        const i = (y * this.width + x) * 4;
        const ia = 1 - amount;
        this.data[i] = clamp255(this.data[i] * ia + r * amount);
        this.data[i + 1] = clamp255(this.data[i + 1] * ia + g * amount);
        this.data[i + 2] = clamp255(this.data[i + 2] * ia + b * amount);
        return this;
    }

    /** Multiply existing alpha by k (used for soft edge falloff). */
    mulAlpha(x, y, k) {
        x = x | 0; y = y | 0;
        if (!this.inBounds(x, y)) { return this; }
        const i = (y * this.width + x) * 4;
        this.data[i + 3] = clamp255(this.data[i + 3] * k);
        return this;
    }

    /** Multiply existing colour (used for shadow passes). */
    mul(x, y, k) {
        x = x | 0; y = y | 0;
        if (!this.inBounds(x, y)) { return this; }
        const i = (y * this.width + x) * 4;
        if (this.data[i + 3] === 0) { return this; }
        this.data[i] = clamp255(this.data[i] * k);
        this.data[i + 1] = clamp255(this.data[i + 1] * k);
        this.data[i + 2] = clamp255(this.data[i + 2] * k);
        return this;
    }

    rect(x, y, w, h, color, alpha = 1) {
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) { this.set(x + i, y + j, color, alpha); }
        }
        return this;
    }

    frame(x, y, w, h, color, alpha = 1) {
        this.hline(x, y, w, color, alpha);
        this.hline(x, y + h - 1, w, color, alpha);
        this.vline(x, y, h, color, alpha);
        this.vline(x + w - 1, y, h, color, alpha);
        return this;
    }

    hline(x, y, w, color, alpha = 1) {
        for (let i = 0; i < w; i++) { this.set(x + i, y, color, alpha); }
        return this;
    }

    vline(x, y, h, color, alpha = 1) {
        for (let j = 0; j < h; j++) { this.set(x, y + j, color, alpha); }
        return this;
    }

    /** Bresenham line. */
    line(x0, y0, x1, y1, color, alpha = 1) {
        x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let guard = 0;
        while (guard++ < 4096) {
            this.set(x0, y0, color, alpha);
            if (x0 === x1 && y0 === y1) { break; }
            const e2 = err * 2;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return this;
    }

    /** Thick line (drawn as a stamp of `t` px). */
    thickLine(x0, y0, x1, y1, t, color, alpha = 1) {
        const o = (t / 2) | 0;
        for (let j = -o; j <= o; j++) {
            for (let i = -o; i <= o; i++) {
                if (i * i + j * j <= o * o + o) { this.set(x0 + i, y0 + j, color, alpha); }
            }
        }
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const steps = Math.max(dx, dy);
        for (let s = 1; s <= steps; s++) {
            const x = Math.round(x0 + (x1 - x0) * (s / steps));
            const y = Math.round(y0 + (y1 - y0) * (s / steps));
            for (let j = -o; j <= o; j++) {
                for (let i = -o; i <= o; i++) {
                    if (i * i + j * j <= o * o + o) { this.set(x + i, y + j, color, alpha); }
                }
            }
        }
        return this;
    }

    circle(cx, cy, r, color, fill = true, alpha = 1) {
        cx = Math.round(cx); cy = Math.round(cy);
        const rr = r * r;
        for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
            for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
                const d = x * x + y * y;
                if (fill ? d <= rr : Math.abs(Math.sqrt(d) - r) < 0.62) {
                    this.set(cx + x, cy + y, color, alpha);
                }
            }
        }
        return this;
    }

    ellipse(cx, cy, rx, ry, color, fill = true, alpha = 1) {
        cx = Math.round(cx); cy = Math.round(cy);
        for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
            for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
                const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
                if (fill ? d <= 1 : Math.abs(d - 1) < 0.22) {
                    this.set(cx + x, cy + y, color, alpha);
                }
            }
        }
        return this;
    }

    /**
     * Organic blob: radius modulated by hashed noise -> natural silhouettes
     * (cloaks, monsters, rocks, smoke puffs).
     */
    blob(cx, cy, rx, ry, color, opts = {}) {
        const {
            seed = 1, jitter = 0.16, lobes = 3, fill = true, alpha = 1, wobble = 0
        } = opts;
        const steps = 128;
        const rad = (a) => {
            let m = 1;
            for (let k = 1; k <= lobes; k++) {
                const n = hash2(k * 31 + seed, k * 17 + seed * 7, seed) * 2 - 1;
                m += n * (jitter / k) * Math.cos(a * k + n * 6.283);
            }
            if (wobble) { m += Math.sin(a * 2 + wobble) * 0.06; }
            return Math.max(0.25, m);
        };
        for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const m = rad(a);
            const x = Math.round(cx + Math.cos(a) * rx * m);
            const y = Math.round(cy + Math.sin(a) * ry * m);
            if (fill) {
                // scanline fill toward the centre keeps it solid
                const stepsIn = Math.max(Math.abs(x - Math.round(cx)), Math.abs(y - Math.round(cy)));
                for (let s = 0; s <= stepsIn; s++) {
                    const t = stepsIn === 0 ? 0 : s / stepsIn;
                    this.set(Math.round(cx + (x - cx) * t), Math.round(cy + (y - cy) * t), color, alpha);
                }
            } else {
                this.set(x, y, color, alpha);
                this.set(x, y + 1, color, alpha);
            }
        }
        return this;
    }

    /** Filled polygon (scanline, integer). */
    poly(points, color, alpha = 1) {
        if (points.length < 3) { return this; }
        let minY = Infinity, maxY = -Infinity;
        for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
        for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
            const xs = [];
            for (let i = 0; i < points.length; i++) {
                const a = points[i], b = points[(i + 1) % points.length];
                if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
                    xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
                }
            }
            xs.sort((p, q) => p - q);
            for (let i = 0; i + 1 < xs.length; i += 2) {
                const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
                for (let x = x0; x < x1; x++) { this.set(x, y + 0.5 | 0, color, alpha); }
            }
        }
        return this;
    }

    /**
     * Draw from an ASCII map. Each character maps to a palette colour,
     * '.' / ' ' = transparent. Great for hand-tuned detail work.
     */
    ascii(rows, palette, ox = 0, oy = 0, alpha = 1) {
        for (let y = 0; y < rows.length; y++) {
            const row = rows[y];
            for (let x = 0; x < row.length; x++) {
                const ch = row[x];
                if (ch === '.' || ch === ' ' || !(ch in palette)) { continue; }
                this.set(ox + x, oy + y, palette[ch], alpha);
            }
        }
        return this;
    }

    /** Stamp another buffer on top (with optional flip / tint / alpha). */
    blit(src, dx, dy, opts = {}) {
        const { flipX = false, flipY = false, tint = null, alpha = 1, mask = null } = opts;
        for (let y = 0; y < src.height; y++) {
            for (let x = 0; x < src.width; x++) {
                const sx = flipX ? src.width - 1 - x : x;
                const sy = flipY ? src.height - 1 - y : y;
                const i = (sy * src.width + sx) * 4;
                const a = src.data[i + 3] / 255;
                if (a <= 0) { continue; }
                if (mask && !mask(x, y, src)) { continue; }
                const c = tint ? toRGB(tint) : [src.data[i], src.data[i + 1], src.data[i + 2]];
                this.set(dx + x, dy + y, c, a * alpha);
            }
        }
        return this;
    }

    /** Bayer-ordered dithered rect between two colours. */
    dither(x, y, w, h, colorA, colorB, ratio = 0.5, alpha = 1) {
        const m = BAYER4;
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                const t = m[(j & 3) * 4 + (i & 3)] / 16;
                this.set(x + i, y + j, t < ratio ? colorA : colorB, alpha);
            }
        }
        return this;
    }

    /** Speckle noise inside existing pixels (adds grain to large flat areas). */
    grain(amount = 0.08, seed = 7) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                if (this.data[i + 3] === 0) { continue; }
                const n = (hash2(x, y, seed) - 0.5) * 2 * amount;
                this.data[i] = clamp255(this.data[i] * (1 + n));
                this.data[i + 1] = clamp255(this.data[i + 1] * (1 + n));
                this.data[i + 2] = clamp255(this.data[i + 2] * (1 + n));
            }
        }
        return this;
    }

    /** Vertical gradient applied only where pixels already exist. */
    vGradient(topColor, bottomColor, y0 = 0, y1 = this.height, amount = 1) {
        const a = toRGB(topColor), b = toRGB(bottomColor);
        for (let y = y0; y < Math.min(y1, this.height); y++) {
            const t = Math.max(0, Math.min(1, (y - y0) / Math.max(1, (y1 - y0))));
            const c = [
                a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t,
                a[2] + (b[2] - a[2]) * t
            ];
            for (let x = 0; x < this.width; x++) {
                if (this.data[(y * this.width + x) * 4 + 3] === 0) { continue; }
                this.blend(x, y, c, amount * (this.data[(y * this.width + x) * 4 + 3] / 255));
            }
        }
        return this;
    }

    /**
     * Volume shading: darkens pixels far from a virtual light source.
     * Cheap way to give flat shapes a rounded, lit look.
     */
    radialShade(cx, cy, radius, dark, amount = 0.5, y0 = 0, y1 = this.height) {
        for (let y = y0; y < Math.min(y1, this.height); y++) {
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                if (this.data[i + 3] === 0) { continue; }
                const d = Math.hypot(x - cx, y - cy) / radius;
                const k = Math.max(0, Math.min(1, d));
                if (k <= 0) { continue; }
                const t = k * k * amount;
                const [r, g, b] = toRGB(dark);
                this.data[i] = clamp255(this.data[i] * (1 - t) + r * t);
                this.data[i + 1] = clamp255(this.data[i + 1] * (1 - t) + g * t);
                this.data[i + 2] = clamp255(this.data[i + 2] * (1 - t) + b * t);
            }
        }
        return this;
    }

    /**
     * Rim light / rim shadow along the silhouette.
     * `dir` = [x, y] direction the light comes FROM.
     */
    rim(dirX, dirY, lightColor, shadowColor, lightAmount = 0.75, shadowAmount = 0.6) {
        const w = this.width, h = this.height;
        const ox = Math.round(dirX), oy = Math.round(dirY);
        const src = new Uint8ClampedArray(this.data);
        const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (src[i + 3] === 0) { continue; }
                const litSide = at(x + ox, y + oy) === 0;
                const darkSide = at(x - ox, y - oy) === 0;
                if (litSide && lightColor) { this.blend(x, y, lightColor, lightAmount); }
                else if (darkSide && shadowColor) { this.blend(x, y, shadowColor, shadowAmount); }
            }
        }
        return this;
    }

    /** 1px dark outline around the whole silhouette. */
    outline(color = 0x0a0710, alpha = 1) {
        const w = this.width, h = this.height;
        const src = new Uint8ClampedArray(this.data);
        const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (src[(y * w + x) * 4 + 3] !== 0) { continue; }
                if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
                    const i = (y * w + x) * 4;
                    const [r, g, b] = toRGB(color);
                    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b;
                    this.data[i + 3] = Math.round(alpha * 255);
                }
            }
        }
        return this;
    }

    /** Solid recolour of everything currently drawn (silhouette pass). */
    silhouette(color) {
        const [r, g, b] = toRGB(color);
        for (let i = 0; i < this.data.length; i += 4) {
            if (this.data[i + 3] > 0) { this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; }
        }
        return this;
    }

    /** Bounding box of non-transparent pixels. */
    bounds() {
        let minX = this.width, minY = this.height, maxX = -1, maxY = -1;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.data[(y * this.width + x) * 4 + 3] > 0) {
                    if (x < minX) { minX = x; }
                    if (x > maxX) { maxX = x; }
                    if (y < minY) { minY = y; }
                    if (y > maxY) { maxY = y; }
                }
            }
        }
        return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    /** Browser helper: write into an ImageData-compatible object. */
    toImageData(ImageDataCtor) {
        return new ImageDataCtor(new Uint8ClampedArray(this.data), this.width, this.height);
    }

    clone() {
        const b = new PixelBuffer(this.width, this.height);
        b.data.set(this.data);
        return b;
    }
}

export const BAYER4 = new Uint8Array([
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
]);

export const BAYER2 = new Uint8Array([0, 2, 3, 1]);

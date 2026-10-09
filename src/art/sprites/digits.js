import { PixelBuffer } from '../PixelBuffer.js';
import { GLYPHS, GLYPH_W, GLYPH_H } from '../glyphs.js';

/**
 * Damage-number / counter glyphs (3x5 each).
 * Rendered white so they can be tinted per context:
 *   normal hit  → warm bone,  crit → gold + 2x scale,
 *   player hurt → red,  healing → green,  XP → cyan.
 */
export const GLYPH_SPRITES = Object.keys(GLYPHS).map((ch) => {
    const safeName = ch === ' ' ? 'space' : ch === '.' ? 'dot' : ch === ',' ? 'comma'
        : ch === ':' ? 'colon' : ch === '?' ? 'quest' : ch === '!' ? 'bang' : ch === '%' ? 'pct'
            : ch === '/' ? 'slash' : ch === '+' ? 'plus' : ch === '-' ? 'minus' : ch === 'x' ? 'times' : ch;
    return {
        key: `g_${safeName}`,
        w: GLYPH_W,
        h: GLYPH_H,
        frames: [`g_${safeName}`],
        paint: (buf) => {
            buf.clear();
            buf.ascii(GLYPHS[ch], { '#': 0xffffff }, 0, 0);
        }
    };
});

/** char → frame name lookup used by the floating-text pool. */
export const GLYPH_FRAME = {};
GLYPH_SPRITES.forEach((s, i) => {
    GLYPH_FRAME[Object.keys(GLYPHS)[i]] = s.frames[0];
});

/**
 * Hand-authored 3x5 pixel glyph set.
 * Used for in-world floating numbers (damage / XP / crits) so they stay razor
 * sharp at any camera zoom and cost nothing to render (plain sprite quads).
 */

export const GLYPH_W = 3;
export const GLYPH_H = 5;

// '#' = lit pixel, '.' = transparent
export const GLYPHS = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#', '##', '.#', '.#', '###'],
    '2': ['###', '..#', '###', '#..', '###'],
    '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#', '.#', '.#'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '###'],
    '-': ['...', '...', '###', '...', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    '!': ['.#', '.#', '.#', '..', '.#'],
    '?': ['###', '..#', '.##', '...', '.#'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'],
    'x': ['...', '#.#', '.#.', '#.#', '...'],
    '.': ['...', '...', '...', '...', '.#'],
    ',': ['...', '...', '...', '.#', '#.'],
    ':': ['...', '.#.', '...', '.#.', '...'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    ' ': ['...', '...', '...', '...', '...']
};

/** Every glyph char we support (used by the atlas builder). */
export const GLYPH_KEYS = Object.keys(GLYPHS);

/** Measure a string in pixels (1px tracking between glyphs). */
export function measureText(str, scale = 1) {
    return (String(str).length * (GLYPH_W + 1) - 1) * scale;
}

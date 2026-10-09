/**
 * Master palette for LAMPLIGHT.
 *
 * Art direction:
 *   • cold violet/indigo night ambient  vs  warm amber lantern key light
 *   • every sprite uses a 1px ink outline (#08060d) so the whole cast reads
 *     as one cohesive set
 *   • emissive colours (amber / cyan / violet) are deliberately over-bright so
 *     the bloom pass has something to grab
 */

export const INK = 0x08060d;
export const INK_SOFT = 0x150f22;

export const P = {
    ink: INK,
    inkSoft: INK_SOFT,

    // ground / night
    night: [0x120d1e, 0x1a1428, 0x241c38, 0x312749],
    moss: [0x2a3b26, 0x38512f, 0x4c6b3d, 0x6b8a52],
    dirt: [0x33262f, 0x463540, 0x5c4646, 0x75605a],
    stone: [0x3a3650, 0x504b68, 0x6a6488, 0x8a84b0, 0xaba6d0],

    // wood / bark
    wood: [0x2a1a12, 0x3d2517, 0x55341f, 0x7a4c2a, 0xa06a3a],

    // lantern / fire (key light)
    amber: [0x8c3a12, 0xd9541f, 0xff8a2b, 0xffb347, 0xffd98a, 0xfff3d0],
    ember: [0x6d1410, 0xc02b25, 0xff6b3d, 0xffa05a],

    // gold / loot
    gold: [0x7a5210, 0xb8862a, 0xffc93c, 0xffe066, 0xfff6c9],

    // frost / souls
    cyan: [0x14506b, 0x2a9fc4, 0x63d8f0, 0xb7f5ff, 0xe8feff],

    // arcane
    violet: [0x3a1a63, 0x6b2fb3, 0xa45cff, 0xd9a7ff, 0xf0dcff],

    // blood / damage
    blood: [0x4a0a1c, 0x8a0f2c, 0xd1233f, 0xff5470, 0xffa3b0],

    // bone / parchment
    bone: [0x6f6152, 0xa89878, 0xd8c9a8, 0xf6ead2, 0xfffbef],

    // spirit green
    ghost: [0x1d5c3a, 0x3fae6a, 0x8ef2a8, 0xd6ffe4],

    // hero cloak (deep indigo-teal)
    cloak: [0x101f30, 0x1a3247, 0x254a63, 0x35688a, 0x5b93b5],
    scarf: [0x8c3a12, 0xd9541f, 0xff8a2b, 0xffd98a],
    skin: [0x8a5a44, 0xc08a63, 0xe8b48c, 0xffd9bb],
    brass: [0x5c4210, 0x9c7420, 0xd9ab3c, 0xffe08a],

    // shadow enemies
    shade: [0x1c1530, 0x2e2450, 0x453a72, 0x645796],
    husk: [0x3a2c1e, 0x5a4630, 0x7d6547, 0xa88c62],
    wisp: [0x1a4a5c, 0x2f8fa8, 0x7fe3ff, 0xd9faff],

    // UI
    uiDark: [0x0d0a16, 0x171226, 0x241c3a, 0x352b52],
    uiLine: [0x4a3d6b, 0x6d5c96, 0x9d8ac4],
    parchment: [0x8a7a58, 0xcdb98f, 0xf2e6c8, 0xfffaf0],
    hpRed: [0x6b0f22, 0xc8203c, 0xff4d63],
    xpBlue: [0x1d4f7a, 0x2f9fd8, 0x8ee6ff],
    rarityCommon: 0xcdb98f,
    rarityRare: 0x63d8f0,
    rarityEpic: 0xa45cff,
    rarityLegend: 0xffc93c
};

/** Luminance helper — used by the auto-shading passes. */
export function lum(color) {
    const [r, g, b] = Array.isArray(color)
        ? color
        : [(color >> 16) & 255, (color >> 8) & 255, color & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Mix two colours (0..1 towards b). */
export function mix(a, b, t) {
    const ca = Array.isArray(a) ? a : [(a >> 16) & 255, (a >> 8) & 255, a & 255];
    const cb = Array.isArray(b) ? b : [(b >> 16) & 255, (b >> 8) & 255, b & 255];
    return [
        Math.round(ca[0] + (cb[0] - ca[0]) * t),
        Math.round(ca[1] + (cb[1] - ca[1]) * t),
        Math.round(ca[2] + (cb[2] - ca[2]) * t)
    ];
}

/** Darken / lighten a ramp colour by a number of steps. */
export function step(ramp, i) {
    return ramp[Math.max(0, Math.min(ramp.length - 1, i))];
}

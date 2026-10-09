import { PixelBuffer } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle } from '../artUtils.js';

/**
 * THE LAMPLIGHTER — the player character.
 *
 * 24x30, feet on the bottom row, drawn facing RIGHT (flipped at runtime).
 * Silhouette read: big hood  →  warm scarf  →  flaring cloak  →  brass lantern.
 * The lantern is the brightest thing on the sprite on purpose: it sells the
 * whole "one small flame against the dark" fantasy.
 */

export const HERO_W = 24;
export const HERO_H = 30;

export const HERO_FRAMES = [
    'hero_idle_0', 'hero_idle_1',
    'hero_walk_0', 'hero_walk_1', 'hero_walk_2', 'hero_walk_3',
    'hero_dash', 'hero_hurt'
];

function drawLantern(buf, x, y, flicker) {
    // handle
    buf.set(x + 3, y - 1, P.brass[2]);
    buf.set(x + 2, y, P.brass[2]);
    buf.set(x + 4, y, P.brass[2]);
    // top cap
    buf.rect(x + 1, y + 1, 5, 1, P.brass[2]);
    buf.set(x, y + 2, P.brass[1]);
    buf.set(x + 6, y + 2, P.brass[1]);
    // glass body — the flame
    const glow = flicker >= 1 ? P.amber[5] : flicker > 0 ? P.amber[4] : P.amber[3];
    buf.rect(x + 1, y + 2, 5, 5, P.amber[2]);
    buf.rect(x + 2, y + 3, 3, 3, glow);
    buf.set(x + 3, y + 4, P.amber[5]);
    // side bars
    buf.vline(x, y + 2, 6, P.brass[1]);
    buf.vline(x + 6, y + 2, 6, P.brass[0]);
    // base
    buf.rect(x + 1, y + 7, 5, 1, P.brass[2]);
    buf.set(x + 1, y + 8, P.brass[1]);
    buf.set(x + 5, y + 8, P.brass[0]);
    // specular
    buf.set(x + 1, y + 3, P.amber[5], 0.9);
}

function drawHero(buf, pose) {
    const {
        bob = 0, legL = 0, legR = 0, cloakSway = 0, scarf = 0,
        lanternY = 0, flicker = 1, lean = 0, hurt = false
    } = pose;

    const cx = 10;                 // body centre
    const top = 2 + bob;           // hood top

    // ── legs / boots ───────────────────────────────────────────────
    const legY = 24 + bob;
    buf.rect(7 + legL, legY, 3, 3, P.wood[2]);
    buf.rect(12 + legR, legY, 3, 3, P.wood[2]);
    buf.rect(6 + legL, legY + 3, 4, 2, P.wood[1]);
    buf.rect(12 + legR, legY + 3, 4, 2, P.wood[1]);
    buf.set(7 + legL, legY, P.wood[3]);
    buf.set(13 + legR, legY, P.wood[3]);

    // ── cloak ──────────────────────────────────────────────────────
    for (let y = 13 + bob; y <= 26 + bob; y++) {
        const t = (y - (13 + bob)) / 13;
        const halfW = 4.8 + t * 4.2 + Math.sin(t * 3.1) * 0.5;
        const sway = cloakSway * t * 1.4;
        const x0 = Math.round(cx - halfW + sway);
        const x1 = Math.round(cx + halfW + sway);
        for (let x = x0; x <= x1; x++) {
            let c = P.cloak[2];
            if (x <= x0 + 1) { c = P.cloak[3]; }                 // lit left edge
            else if (x >= x1 - 1) { c = P.cloak[0]; }            // shadowed right edge
            else if (t > 0.78) { c = P.cloak[1]; }               // darker hem
            if (y === 26 + bob) { c = P.cloak[0]; }
            buf.set(x + lean * t, y, c);
        }
    }
    // amber hem trim
    for (let x = Math.round(cx - 8 + cloakSway * 1.4); x <= Math.round(cx + 8 + cloakSway * 1.4); x++) {
        buf.set(x, 25 + bob, P.scarf[1], 0.9);
    }
    // front opening line
    buf.vline(cx + 1, 15 + bob, 9, P.cloak[0], 0.85);
    speckle(buf, cx - 7, 14 + bob, 14, 12, P.cloak[3], 0.06, 21, 0.5);

    // ── arms ───────────────────────────────────────────────────────
    buf.rect(cx - 6 + lean, 15 + bob, 2, 5, P.cloak[3]);         // back arm
    buf.rect(cx + 5, 15 + bob, 2, 4 + lanternY, P.cloak[2]);     // lantern arm
    buf.set(cx + 6, 18 + bob + lanternY, P.skin[1]);             // hand

    // ── scarf ──────────────────────────────────────────────────────
    buf.rect(cx - 5, 13 + bob, 11, 2, P.scarf[1]);
    buf.rect(cx - 5, 13 + bob, 11, 1, P.scarf[2]);
    buf.set(cx - 5, 13 + bob, P.scarf[3]);
    // trailing tail (animated, thin so it reads as cloth)
    const tail = [
        [cx - 5, 15 + bob], [cx - 7, 16 + bob + scarf], [cx - 8, 18 + bob + scarf * 1.5]
    ];
    for (let i = 0; i < tail.length - 1; i++) {
        buf.line(tail[i][0], Math.round(tail[i][1]), tail[i + 1][0], Math.round(tail[i + 1][1]), P.scarf[1]);
    }
    buf.set(Math.round(tail[2][0]), Math.round(tail[2][1]) + 1, P.scarf[0]);
    buf.set(Math.round(tail[1][0]), Math.round(tail[1][1]) - 1, P.scarf[2]);

    // ── hood ───────────────────────────────────────────────────────
    buf.ellipse(cx, top + 5.6, 6, 5.6, P.cloak[2]);
    buf.ellipse(cx - 1.4, top + 4, 3.6, 2.8, P.cloak[3]);        // lit crown
    buf.ellipse(cx + 3.4, top + 7, 2.2, 3, P.cloak[1]);          // shadow side
    // hood peak
    buf.set(cx - 1, top, P.cloak[3]);
    // face opening
    buf.ellipse(cx + 1.2, top + 6.6, 3.4, 3, P.night[1]);
    buf.ellipse(cx + 1.6, top + 7.2, 2.2, 1.8, P.night[0]);
    // cheek / chin in warm light
    buf.set(cx + 1, top + 9, P.skin[1], 0.9);
    buf.set(cx + 2, top + 9, P.skin[1], 0.7);
    buf.set(cx + 2, top + 10, P.skin[0], 0.8);
    // eyes — two sharp glowing pixels (reads at any zoom)
    if (!hurt) {
        buf.set(cx, top + 6, P.amber[4]);
        buf.set(cx + 3, top + 6, P.amber[4]);
        buf.set(cx, top + 5, P.amber[2], 0.55);
        buf.set(cx + 3, top + 5, P.amber[2], 0.55);
        buf.set(cx - 1, top + 6, P.amber[2], 0.35);
        buf.set(cx + 4, top + 6, P.amber[2], 0.35);
    } else {
        buf.hline(cx, top + 6, 1, P.blood[3]);
        buf.hline(cx + 3, top + 6, 1, P.blood[3]);
    }

    // ── lantern ────────────────────────────────────────────────────
    drawLantern(buf, cx + 7, 18 + bob + lanternY, flicker);

    // ── belt ───────────────────────────────────────────────────────
    buf.rect(cx - 5, 19 + bob, 11, 2, P.wood[2]);
    buf.rect(cx - 5, 19 + bob, 11, 1, P.wood[3], 0.7);
    buf.rect(cx, 19 + bob, 2, 2, P.gold[2]);
    buf.set(cx, 19 + bob, P.gold[3]);
}

export function paintHero(buf, frame) {
    buf.clear();
    switch (frame) {
        case 0: drawHero(buf, { bob: 0, flicker: 1, scarf: 0, lanternY: 0 }); break;
        case 1: drawHero(buf, { bob: 1, flicker: 0.5, scarf: 1, lanternY: 1, cloakSway: 0.3 }); break;
        case 2: drawHero(buf, { bob: 0, legL: -1, legR: 1, flicker: 1, cloakSway: -0.6, lanternY: 0 }); break;
        case 3: drawHero(buf, { bob: -1, legL: 0, legR: 0, flicker: 0.5, cloakSway: 0, scarf: -1, lanternY: -1 }); break;
        case 4: drawHero(buf, { bob: 0, legL: 1, legR: -1, flicker: 1, cloakSway: 0.6, lanternY: 0 }); break;
        case 5: drawHero(buf, { bob: -1, legL: 0, legR: 0, flicker: 0.5, cloakSway: 0, scarf: 1, lanternY: -1 }); break;
        case 6: drawHero(buf, { bob: 0, legL: 2, legR: -2, lean: 2, flicker: 1, cloakSway: -2, scarf: -2, lanternY: -1 }); break;
        case 7: drawHero(buf, { bob: 1, flicker: 0.2, scarf: 1, cloakSway: 0.8, hurt: true, lanternY: 1 }); break;
    }
    finish(buf, { grain: 0.045, seed: 5 });
    return buf;
}

/** Ghost/after-image variant used by the dash (drawn additively at runtime). */
export function paintHeroGhost(buf) {
    buf.clear();
    drawHero(buf, { bob: 0, legL: 2, legR: -2, lean: 2, flicker: 1, cloakSway: -2, scarf: -2 });
    buf.silhouette(P.cyan[2]);
    return buf;
}

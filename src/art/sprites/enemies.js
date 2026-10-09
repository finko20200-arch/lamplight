import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, eyes, speckle } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   BESTIARY — «Полый лес»
   Every creature shares: 1px ink outline, cool ambient shadow, warm rim on
   the top-left (the player's lantern is the only light source in the world).
   ══════════════════════════════════════════════════════════════════════ */

/* ─── helpers ─────────────────────────────────────────────────────── */

/** Jagged tattered bottom edge (cloak of a wraith). */
function tatters(buf, y, x0, x1, color, seed, len = 4) {
    for (let x = x0; x <= x1; x++) {
        const n = hash2(x, seed, seed);
        const h = Math.round(n * len) + (x % 2);
        for (let i = 0; i <= h; i++) {
            buf.set(x, y + i, i === h ? mix(color, INK, 0.45) : color);
        }
    }
}

/** Glowing crack veins. */
function cracks(buf, points, color, seed = 4) {
    for (let i = 0; i < points.length - 1; i++) {
        buf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color);
    }
}

/* ─── SHADE · Тень ────────────────────────────────────────────────── */

function paintShade(buf, frame) {
    buf.clear();
    const bob = [0, -1, 0, 1][frame];
    const cx = 10;
    // cloak body
    for (let y = 6 + bob; y <= 19 + bob; y++) {
        const t = (y - 6 - bob) / 13;
        const hw = 3.4 + t * 4.6;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            let c = P.shade[2];
            if (x <= cx - hw + 1.2) { c = P.shade[3]; }
            else if (x >= cx + hw - 1.2) { c = P.shade[0]; }
            if (t > 0.78) { c = mix(c, INK, 0.3); }
            buf.set(x, y, c);
        }
    }
    tatters(buf, 20 + bob, cx - 8, cx + 8, P.shade[1], 3 + frame, 4);

    // hood
    buf.ellipse(cx, 6 + bob, 5.2, 4.8, P.shade[2]);
    buf.ellipse(cx - 1.4, 4.6 + bob, 3, 2.4, P.shade[3]);
    buf.ellipse(cx + 2.4, 7 + bob, 2, 2.6, P.shade[0]);
    // void face
    buf.ellipse(cx + 0.6, 7 + bob, 3.2, 2.9, P.night[0]);
    // eyes — bright cyan slits with bleed
    const eyeY = 6 + bob;
    buf.hline(cx - 2, eyeY, 2, P.cyan[3]);
    buf.hline(cx + 1, eyeY, 2, P.cyan[3]);
    buf.set(cx - 2, eyeY, P.cyan[4]);
    buf.set(cx + 2, eyeY, P.cyan[4]);
    buf.set(cx - 2, eyeY + 1, P.cyan[1], 0.6);
    buf.set(cx + 2, eyeY + 1, P.cyan[1], 0.6);
    buf.set(cx - 1, eyeY - 1, P.cyan[2], 0.4);
    buf.set(cx + 2, eyeY - 1, P.cyan[2], 0.4);

    // claws reaching forward
    const armY = 13 + bob + (frame % 2);
    buf.line(cx + 4, armY, cx + 8, armY + 2, P.shade[2]);
    buf.set(cx + 9, armY + 2, P.bone[2]);
    buf.set(cx + 8, armY + 3, P.bone[2]);
    buf.set(cx + 9, armY + 4, P.bone[1]);
    buf.line(cx - 4, armY + 1, cx - 7, armY + 3, P.shade[1]);
    buf.set(cx - 8, armY + 3, P.bone[1]);

    finish(buf, { rimLight: P.cyan[2], lightAmount: 0.22, shadowAmount: 0.45, grain: 0.05, seed: 12 });
}

/* ─── WISP · Блуждающий огонёк ───────────────────────────────────── */

function paintWisp(buf, frame) {
    buf.clear();
    const cx = 7, cy = 8;
    const sway = [0, 1, 0, -1][frame];
    // outer flame
    buf.blob(cx + sway * 0.4, cy, 5.4, 6.2, P.cyan[1], { seed: 5 + frame, jitter: 0.18, lobes: 3 });
    buf.blob(cx + sway * 0.4, cy - 0.5, 3.8, 4.6, P.cyan[2], { seed: 9 + frame, jitter: 0.16, lobes: 3 });
    buf.blob(cx, cy - 0.6, 2.2, 2.8, P.cyan[3], { seed: 13, jitter: 0.1, lobes: 2 });
    buf.ellipse(cx, cy - 0.6, 1.1, 1.4, P.cyan[4]);
    // tail flame upward
    const t = frame / 3;
    buf.line(cx, cy - 5, cx + Math.round(Math.sin(t * 6.28) * 2), cy - 8, P.cyan[1], 0.8);
    buf.set(cx + Math.round(Math.sin(t * 6.28) * 2), cy - 9, P.cyan[2], 0.5);
    // eyes (tiny, malevolent)
    buf.set(cx - 1, cy - 1, P.night[0]);
    buf.set(cx + 1, cy - 1, P.night[0]);
    // specks
    buf.set(cx - 4, cy + 2 + (frame % 2), P.cyan[2], 0.6);
    buf.set(cx + 4, cy + 1 + ((frame + 1) % 2), P.cyan[2], 0.5);
    finish(buf, { rimLight: P.cyan[4], rimShadow: null, lightAmount: 0.3, shadowAmount: 0, grain: 0, skipOutline: true });
}

/* ─── HUSK · Истукан ─────────────────────────────────────────────── */

function paintHusk(buf, frame) {
    buf.clear();
    const cx = 15;
    const stomp = [0, -1, 0, 1][frame];
    const legOut = [-1, 0, 1, 0][frame];

    // legs
    buf.rect(cx - 8 + legOut, 26 + stomp, 6, 8, P.husk[1]);
    buf.rect(cx + 3 - legOut, 26 + stomp, 6, 8, P.husk[0]);
    buf.rect(cx - 9 + legOut, 32 + stomp, 8, 2, P.husk[0]);
    buf.rect(cx + 2 - legOut, 32 + stomp, 8, 2, P.husk[0]);

    // torso: layered stone/wood plates
    for (let y = 10 + stomp; y <= 27 + stomp; y++) {
        const t = (y - 10 - stomp) / 17;
        const hw = 9 - Math.pow(t - 0.35, 2) * 6;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            let c = P.husk[1];
            if (x <= cx - hw + 2) { c = P.husk[2]; }
            else if (x >= cx + hw - 2) { c = P.husk[0]; }
            buf.set(x, y, c);
        }
    }
    // plate seams
    buf.hline(cx - 8, 15 + stomp, 17, P.husk[0], 0.9);
    buf.hline(cx - 7, 21 + stomp, 15, P.husk[0], 0.9);
    buf.hline(cx - 8, 16 + stomp, 17, P.husk[3], 0.35);
    speckle(buf, cx - 9, 10 + stomp, 19, 18, P.husk[2], 0.1, 31, 0.7);

    // ember cracks glowing from within
    const pulse = frame % 2 ? P.amber[2] : P.amber[3];
    cracks(buf, [[cx - 4, 12 + stomp], [cx - 2, 15 + stomp], [cx - 5, 18 + stomp], [cx - 3, 22 + stomp]], pulse);
    cracks(buf, [[cx + 3, 13 + stomp], [cx + 5, 17 + stomp], [cx + 2, 20 + stomp]], mix(pulse, P.ember[1], 0.4));
    buf.set(cx - 2, 15 + stomp, P.amber[4]);
    buf.set(cx + 5, 17 + stomp, P.amber[4]);

    // shoulders / pauldrons
    buf.ellipse(cx - 9, 12 + stomp, 4.4, 3.6, P.husk[2]);
    buf.ellipse(cx + 9, 12 + stomp, 4.4, 3.6, P.husk[1]);
    buf.ellipse(cx - 9, 11 + stomp, 3, 2, P.husk[3]);
    // moss on the left pauldron
    speckle(buf, cx - 13, 9 + stomp, 8, 6, P.moss[3], 0.3, 7, 0.9);

    // arms
    buf.rect(cx - 13, 14 + stomp, 4, 10, P.husk[1]);
    buf.rect(cx + 10, 14 + stomp, 4, 10, P.husk[0]);
    buf.ellipse(cx - 11, 26 + stomp, 3.4, 3, P.husk[2]);   // fist
    buf.ellipse(cx + 12, 26 + stomp, 3.4, 3, P.husk[1]);
    // knuckles
    buf.set(cx - 13, 25 + stomp, P.bone[1]);
    buf.set(cx - 11, 24 + stomp, P.bone[1]);
    buf.set(cx + 12, 25 + stomp, P.bone[0]);

    // head — small, sunken, horned
    buf.ellipse(cx, 7 + stomp, 5, 4.6, P.husk[1]);
    buf.ellipse(cx - 1, 5.4 + stomp, 3, 2, P.husk[2]);
    buf.ellipse(cx + 0.5, 8 + stomp, 3.6, 2.6, P.night[0]);
    eyes(buf, cx - 2, 7 + stomp, 4, P.ember[1], P.amber[3]);
    // horns
    buf.line(cx - 4, 4 + stomp, cx - 7, 0 + stomp, P.bone[1]);
    buf.line(cx + 4, 4 + stomp, cx + 7, 0 + stomp, P.bone[1]);
    buf.set(cx - 7, 0 + stomp, P.bone[2]);
    buf.set(cx + 7, 0 + stomp, P.bone[2]);
    // jaw teeth
    buf.set(cx - 1, 10 + stomp, P.bone[1]);
    buf.set(cx + 1, 10 + stomp, P.bone[1]);
    buf.set(cx + 3, 9 + stomp, P.bone[0]);

    finish(buf, { rimLight: P.amber[3], lightAmount: 0.2, shadowAmount: 0.5, grain: 0.07, seed: 41 });
}

/* ─── SPITTER · Плевун ───────────────────────────────────────────── */

function paintSpitter(buf, frame) {
    buf.clear();
    const cx = 11;
    const bob = [0, 1, 0, -1][frame];
    const inflate = frame >= 2 ? 1 + (frame - 1) * 0.5 : 1;

    // legs (thin, digitigrade)
    for (const dx of [-4, 4]) {
        buf.line(cx + dx, 16 + bob, cx + dx + (dx < 0 ? -2 : 2), 21 + bob, P.shade[1]);
        buf.line(cx + dx + (dx < 0 ? -2 : 2), 21 + bob, cx + dx, 24 + bob, P.shade[1]);
        buf.set(cx + dx - 1, 24 + bob, P.bone[1]);
        buf.set(cx + dx, 24 + bob, P.bone[1]);
        buf.set(cx + dx + 1, 24 + bob, P.bone[1]);
    }

    // body (hunched)
    buf.ellipse(cx - 1, 13 + bob, 6, 5, P.shade[2]);
    buf.ellipse(cx - 2.5, 11.5 + bob, 3.4, 3, P.shade[3]);
    speckle(buf, cx - 7, 8 + bob, 12, 10, P.violet[1], 0.12, 17, 0.75);

    // glowing glands on the back
    buf.set(cx - 5, 10 + bob, P.violet[2]);
    buf.set(cx - 4, 12 + bob, P.violet[2]);
    buf.set(cx - 6, 13 + bob, P.violet[1]);

    // head + huge sac mouth
    buf.ellipse(cx + 4, 9 + bob, 4.4, 4, P.shade[2]);
    const sacR = 3.2 * inflate;
    buf.ellipse(cx + 5.5, 12 + bob, sacR, sacR * 0.9, P.violet[1]);
    buf.ellipse(cx + 5.5, 12 + bob, sacR * 0.62, sacR * 0.56, P.violet[2]);
    buf.ellipse(cx + 5.5, 12 + bob, sacR * 0.3, sacR * 0.28, P.violet[3]);
    if (frame >= 2) { buf.set(Math.round(cx + 5.5), Math.round(12 + bob), P.violet[4]); }
    // teeth around the sac
    for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45;
        buf.set(Math.round(cx + 5.5 + Math.cos(a) * sacR), Math.round(12 + bob + Math.sin(a) * sacR), P.bone[2]);
    }
    // eye
    buf.set(cx + 3, 7 + bob, P.violet[3]);
    buf.set(cx + 6, 7 + bob, P.violet[3]);
    buf.set(cx + 3, 7 + bob, P.violet[4]);

    // arms
    buf.line(cx + 1, 13 + bob, cx + 3, 17 + bob, P.shade[2]);
    buf.set(cx + 3, 18 + bob, P.bone[1]);
    buf.line(cx - 5, 14 + bob, cx - 7, 18 + bob, P.shade[1]);
    buf.set(cx - 7, 19 + bob, P.bone[0]);

    finish(buf, { rimLight: P.violet[3], lightAmount: 0.2, shadowAmount: 0.45, grain: 0.06, seed: 23 });
}

/* ─── BOMBER · Порченый ──────────────────────────────────────────── */

function paintBomber(buf, frame) {
    buf.clear();
    const cx = 10, cy = 11;
    const pulse = frame % 2 === 0 ? 1 : 0;
    const swell = frame >= 2 ? 0.6 : 0;

    // legs
    buf.rect(cx - 5, 17, 3, 3, P.shade[0]);
    buf.rect(cx + 2, 17, 3, 3, P.shade[0]);
    buf.hline(cx - 6, 19, 4, P.bone[0]);
    buf.hline(cx + 2, 19, 4, P.bone[0]);

    // bloated body
    buf.ellipse(cx, cy, 8 + swell, 7.4 + swell, P.blood[1]);
    buf.ellipse(cx - 2, cy - 2, 4.6, 3.6, P.blood[2]);
    buf.ellipse(cx + 4, cy + 3, 3, 2.6, P.blood[0]);
    // stitches
    for (let i = -5; i <= 5; i += 2) {
        buf.set(cx + i, cy + Math.round(Math.abs(i) * 0.4) - 3, P.bone[1], 0.85);
    }
    buf.line(cx - 6, cy - 1, cx + 6, cy - 1, P.blood[0], 0.55);
    speckle(buf, cx - 8, cy - 7, 16, 14, P.blood[2], 0.09, 19, 0.6);

    // molten core showing through a rupture
    const coreC = pulse ? P.amber[4] : P.amber[2];
    buf.ellipse(cx + 1, cy + 2, 3.2 + swell, 2.6 + swell, P.ember[1]);
    buf.ellipse(cx + 1, cy + 2, 2.2 + swell, 1.8 + swell, coreC);
    buf.set(cx + 1, cy + 2, pulse ? P.amber[5] : P.amber[4]);
    buf.set(cx - 1, cy + 1, coreC, 0.8);
    buf.set(cx + 3, cy + 3, P.ember[2], 0.7);

    // head — tiny, angry
    buf.ellipse(cx - 1, cy - 6, 3.4, 2.8, P.blood[1]);
    eyes(buf, cx - 3, cy - 6, 3, P.amber[2], pulse ? P.amber[5] : P.amber[4]);
    // mouth
    buf.hline(cx - 3, cy - 4, 4, P.night[0]);
    buf.set(cx - 2, cy - 3, P.bone[1]);
    buf.set(cx, cy - 3, P.bone[1]);

    // stubby arms
    buf.line(cx - 8, cy, cx - 10, cy + 3, P.blood[0]);
    buf.line(cx + 8, cy, cx + 10, cy + 3, P.blood[0]);

    finish(buf, { rimLight: P.amber[3], lightAmount: 0.18, shadowAmount: 0.5, grain: 0.06, seed: 29 });
}

/* ─── CRAWLER · Личинка ──────────────────────────────────────────── */

function paintCrawler(buf, frame) {
    buf.clear();
    const cy = 6;
    // segments, wave animated — earthy grub with pale chitin plates
    for (let sIdx = 3; sIdx >= 0; sIdx--) {
        const x = 3 + sIdx * 3;
        const y = cy + Math.round(Math.sin((frame / 4) * 6.283 + sIdx * 0.9) * 1.4);
        const r = sIdx === 0 ? 3 : 2.4 - sIdx * 0.15;
        buf.ellipse(x, y, r, r * 0.86, sIdx === 0 ? P.husk[1] : P.husk[2]);
        buf.ellipse(x - 0.6, y - 0.8, r * 0.55, r * 0.45, sIdx === 0 ? P.husk[2] : P.husk[3]);
        buf.set(x, y + 2, P.husk[0], 0.8);
        // legs
        buf.set(x - 1, y + 3, P.night[1]);
        buf.set(x + 1, y + 3, P.night[1]);
    }
    // head details
    const hy = cy + Math.round(Math.sin((frame / 4) * 6.283) * 1.4);
    buf.set(1, hy - 1, P.amber[2]);
    buf.set(1, hy + 1, P.amber[2]);
    buf.set(0, hy, P.night[0]);
    buf.set(2, hy - 2, P.husk[3]);
    // mandibles
    buf.set(0, hy - 2, P.bone[1]);
    buf.set(0, hy + 2, P.bone[1]);
    finish(buf, { rimLight: P.husk[3], lightAmount: 0.3, shadowAmount: 0.45, grain: 0.05, seed: 37 });
}

/* ─── HOLLOW KING · Полый Король (boss) ──────────────────────────── */

function paintBoss(buf, frame) {
    buf.clear();
    const cx = 36;
    const bob = [0, -2, -1, 1][frame % 4];
    const attack = frame >= 4;
    const sway = attack ? 2 : [0, 1, 0, -1][frame % 4];

    /* ── royal cloak (3 layers of tatters) ── */
    for (let layer = 0; layer < 3; layer++) {
        const shade = [P.shade[0], P.violet[0], P.shade[1]][layer];
        const off = layer * 2;
        const alpha = [1, 0.95, 0.85][layer];
        for (let y = 22 + bob; y <= 74 + bob - layer * 2; y++) {
            const t = (y - 22 - bob) / 52;
            const hw = 12 + t * (16 - layer * 2) + Math.sin(t * 5 + layer) * 2 + sway * t;
            for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
                if (layer && t > 0.72 && hash2(x, y + layer * 31, 7) < 0.34) { continue; }
                buf.set(x, y, shade, alpha);
            }
        }
        tatters(buf, 74 + bob - layer * 2, Math.round(cx - 26 + off), Math.round(cx + 26 - off), shade, 11 + layer * 5 + (frame % 2), 7 - layer * 2);
    }
    // cloak inner lining (violet)
    for (let y = 26 + bob; y <= 66 + bob; y++) {
        const t = (y - 26 - bob) / 40;
        buf.set(Math.round(cx - 6 - t * 3 + sway * t), y, P.violet[0], 0.9);
        buf.set(Math.round(cx + 6 + t * 3 + sway * t), y, P.violet[0], 0.7);
    }
    // gold trim on the cloak edges
    for (let y = 24 + bob; y <= 70 + bob; y++) {
        const t = (y - 24 - bob) / 46;
        if ((y + frame) % 5 === 0) {
            buf.set(Math.round(cx - 11 - t * 13 + sway * t), y, P.gold[1]);
            buf.set(Math.round(cx + 11 + t * 13 + sway * t), y, P.gold[0]);
        }
    }

    /* ── ribcage / hollow torso ── */
    for (let y = 26 + bob; y <= 46 + bob; y++) {
        const t = (y - 26 - bob) / 20;
        const hw = 11 - Math.pow(t - 0.4, 2) * 10;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            buf.set(x, y, P.night[0]);
        }
    }
    // ribs
    for (let i = 0; i < 5; i++) {
        const y = 28 + i * 4 + bob;
        const w = 10 - i * 0.9;
        buf.line(Math.round(cx - w), y, Math.round(cx - 1), y + 2, P.bone[2]);
        buf.line(Math.round(cx + w), y, Math.round(cx + 1), y + 2, P.bone[1]);
        buf.line(Math.round(cx - w), y + 1, Math.round(cx - 1), y + 3, P.bone[0], 0.5);
    }
    // sternum + spine glow
    buf.vline(cx, 26 + bob, 20, P.bone[1]);
    const soulPulse = frame % 2 ? P.violet[3] : P.violet[2];
    buf.ellipse(cx, 34 + bob, 3, 3.4, P.violet[0]);
    buf.ellipse(cx, 34 + bob, 2, 2.4, soulPulse);
    buf.set(cx, 34 + bob, P.violet[4]);

    /* ── pauldrons ── */
    for (const s of [-1, 1]) {
        const px = cx + s * 15;
        buf.ellipse(px, 24 + bob, 8, 6, s < 0 ? P.stone[2] : P.stone[1]);
        buf.ellipse(px - s * 2, 21.5 + bob, 5, 3.4, P.stone[3]);
        // spikes
        for (let i = 0; i < 2; i++) {
            const sx2 = px - s * 3 + s * i * 6;
            buf.line(sx2, 20 + bob, sx2 + s * 2, 15 + bob - i, P.bone[1]);
            buf.set(sx2 + s * 2, 14 + bob - i, P.bone[2]);
        }
        speckle(buf, px - 8, 18 + bob, 16, 12, P.moss[1], 0.14, 53, 0.8);
    }

    /* ── arms ── */
    buf.line(cx - 15, 28 + bob, cx - 20, 40 + bob, P.shade[1]);
    buf.line(cx - 20, 40 + bob, cx - 17, 48 + bob, P.shade[1]);
    buf.ellipse(cx - 17, 49 + bob, 3, 2.6, P.bone[1]);
    // sceptre arm
    const armRaise = attack ? -10 : 0;
    buf.line(cx + 15, 28 + bob, cx + 21, 38 + bob + armRaise, P.shade[2]);
    buf.ellipse(cx + 22, 39 + bob + armRaise, 3, 2.6, P.bone[1]);

    /* ── sceptre ── */
    const sx = cx + 22, sy = 40 + bob + armRaise;
    buf.line(sx, sy, sx + 3, sy - 22, P.wood[1]);
    buf.line(sx - 1, sy, sx + 2, sy - 22, P.wood[2], 0.6);
    // broken top + floating orb
    const orbY = sy - 26 + (frame % 2 ? 0 : 1);
    buf.ellipse(sx + 4, orbY, 4.6, 4.6, P.violet[1]);
    buf.ellipse(sx + 4, orbY, 3, 3, P.violet[2]);
    buf.ellipse(sx + 3.4, orbY - 0.8, 1.6, 1.6, P.violet[4]);
    // orbiting shards
    for (let i = 0; i < 3; i++) {
        const a = (frame / 6) * 6.283 + i * 2.09;
        buf.set(Math.round(sx + 4 + Math.cos(a) * 7), Math.round(orbY + Math.sin(a) * 5), P.violet[3]);
    }

    /* ── skull head + crown ── */
    const hy = 14 + bob;
    buf.ellipse(cx, hy + 4, 8.4, 8, P.bone[2]);
    buf.ellipse(cx - 2, hy + 1, 5, 4, P.bone[3]);
    buf.ellipse(cx + 4, hy + 6, 3.4, 4, P.bone[1]);
    // eye sockets
    buf.ellipse(cx - 3.4, hy + 4, 2.6, 2.8, P.night[0]);
    buf.ellipse(cx + 3.4, hy + 4, 2.6, 2.8, P.night[0]);
    // soul fire in the sockets
    const eyeC = attack ? P.violet[4] : (frame % 2 ? P.violet[3] : P.violet[2]);
    buf.ellipse(cx - 3.4, hy + 4, 1.6, 2, eyeC);
    buf.ellipse(cx + 3.4, hy + 4, 1.6, 2, eyeC);
    buf.set(Math.round(cx - 3.4), Math.round(hy + 3), P.violet[4]);
    buf.set(Math.round(cx + 3.4), Math.round(hy + 3), P.violet[4]);
    // flame plume from sockets
    buf.line(Math.round(cx - 3.4), hy + 2, Math.round(cx - 4 + sway * 0.4), hy - 2, P.violet[2], 0.7);
    buf.line(Math.round(cx + 3.4), hy + 2, Math.round(cx + 4 + sway * 0.4), hy - 2, P.violet[2], 0.7);
    // nasal cavity + jaw
    buf.set(cx, hy + 7, P.night[0]);
    buf.set(cx - 1, hy + 8, P.night[0]);
    buf.hline(cx - 4, hy + 10, 9, P.bone[1]);
    for (let i = 0; i < 5; i++) { buf.set(cx - 4 + i * 2, hy + 11, P.bone[0]); }
    // crown
    buf.rect(cx - 8, hy - 5, 17, 3, P.gold[1]);
    buf.rect(cx - 8, hy - 5, 17, 1, P.gold[3]);
    for (let i = 0; i < 5; i++) {
        const px = cx - 8 + i * 4;
        buf.line(px, hy - 6, px + 1, hy - 11 - (i === 2 ? 3 : 0), P.gold[2]);
        buf.set(px + 1, hy - 12 - (i === 2 ? 3 : 0), P.gold[3]);
    }
    buf.set(cx, hy - 4, P.violet[3]);      // crown gem
    buf.set(cx - 4, hy - 4, P.blood[2]);
    buf.set(cx + 4, hy - 4, P.cyan[2]);

    finish(buf, { rimLight: P.violet[3], lightAmount: 0.22, shadowAmount: 0.5, grain: 0.05, seed: 61 });
}

/* ─── elite decorations (crown + aura) ───────────────────────────── */

function paintEliteCrown(buf, frame) {
    buf.clear();
    const c = frame % 2 ? P.blood[3] : P.blood[2];
    buf.rect(1, 4, 11, 2, P.gold[1]);
    buf.rect(1, 4, 11, 1, P.gold[2]);
    for (let i = 0; i < 3; i++) {
        const x = 2 + i * 4;
        buf.line(x, 3, x + 1, 0, P.gold[2]);
        buf.set(x + 1, 0, c);
    }
    finish(buf, { rimLight: P.gold[3], lightAmount: 0.3, shadowAmount: 0.3, grain: 0 });
}

function paintEliteAura(buf, frame) {
    buf.clear();
    const cx = 20, cy = 20;
    const r = 15 + (frame % 2);
    for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
            const d = Math.hypot(x - cx, y - cy);
            const t = Math.abs(d - r);
            if (t < 2.2) {
                const a = (1 - t / 2.2) * 0.55;
                buf.set(x, y, frame < 2 ? P.blood[2] : P.blood[3], a);
            }
        }
    }
    // rising embers around the ring
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283 + frame * 0.5;
        const rr = r + Math.sin(frame + i) * 2;
        buf.set(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.6), P.amber[3], 0.8);
    }
}

/* ─── spawn portal ───────────────────────────────────────────────── */

function paintPortal(buf, frame) {
    buf.clear();
    const cx = 22, cy = 26;
    const t = frame / 4;
    for (let y = 0; y < 52; y++) {
        for (let x = 0; x < 44; x++) {
            const dx = (x - cx) / 15, dy = (y - cy) / 22;
            const d = Math.hypot(dx, dy);
            if (d > 1.05) { continue; }
            const swirl = Math.sin(d * 9 - t * 12 + Math.atan2(dy, dx) * 2) * 0.5 + 0.5;
            const edge = 1 - Math.pow(d, 2.4);
            const a = edge * (0.35 + swirl * 0.55);
            const c = d < 0.35 ? P.violet[4] : d < 0.7 ? P.violet[2] : P.violet[1];
            buf.set(x, y, c, a);
        }
    }
    // rim
    for (let i = 0; i < 64; i++) {
        const a = (i / 64) * 6.283;
        buf.set(Math.round(cx + Math.cos(a) * 15), Math.round(cy + Math.sin(a) * 22), P.violet[3], 0.9);
        buf.set(Math.round(cx + Math.cos(a) * 14), Math.round(cy + Math.sin(a) * 21), P.violet[2], 0.5);
    }
}

/* ─── registry ───────────────────────────────────────────────────── */

export const ENEMY_SPRITES = [
    { key: 'shade', w: 20, h: 26, frames: ['shade_0', 'shade_1', 'shade_2', 'shade_3'], paint: paintShade },
    { key: 'wisp', w: 14, h: 16, frames: ['wisp_0', 'wisp_1', 'wisp_2', 'wisp_3'], paint: paintWisp },
    { key: 'husk', w: 30, h: 34, frames: ['husk_0', 'husk_1', 'husk_2', 'husk_3'], paint: paintHusk },
    { key: 'spitter', w: 22, h: 26, frames: ['spitter_0', 'spitter_1', 'spitter_2', 'spitter_3'], paint: paintSpitter },
    { key: 'bomber', w: 20, h: 22, frames: ['bomber_0', 'bomber_1', 'bomber_2', 'bomber_3'], paint: paintBomber },
    { key: 'crawler', w: 14, h: 12, frames: ['crawler_0', 'crawler_1', 'crawler_2', 'crawler_3'], paint: paintCrawler },
    { key: 'boss', w: 72, h: 84, frames: ['boss_0', 'boss_1', 'boss_2', 'boss_3', 'boss_atk_0', 'boss_atk_1'], paint: paintBoss },
    { key: 'elite_crown', w: 13, h: 8, frames: ['elite_crown_0', 'elite_crown_1'], paint: paintEliteCrown },
    { key: 'elite_aura', w: 40, h: 40, frames: ['elite_aura_0', 'elite_aura_1', 'elite_aura_2', 'elite_aura_3'], paint: paintEliteAura },
    { key: 'portal', w: 44, h: 52, frames: ['portal_0', 'portal_1', 'portal_2', 'portal_3'], paint: paintPortal }
];

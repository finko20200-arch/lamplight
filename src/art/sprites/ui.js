import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle, softDot } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   UI ICONS — 22x22, one consistent style:
   chunky dark-metal silhouette + a single emissive accent + warm rim light.
   ══════════════════════════════════════════════════════════════════════ */

const W = 22, H = 22;

const icon = (draw, opts = {}) => (buf, frame = 0) => {
    buf.clear();
    draw(buf, frame);
    finish(buf, {
        rimLight: opts.rim ?? P.amber[4],
        rimShadow: opts.shadow ?? P.night[0],
        lightAmount: opts.light ?? 0.3,
        shadowAmount: opts.dark ?? 0.42,
        grain: opts.grain ?? 0.03,
        seed: opts.seed ?? 7,
        skipOutline: opts.noOutline ?? false
    });
};

const C = 11; // icon centre

function metal(buf, pts, base = P.stone[2], hi = P.stone[3], lo = P.stone[0]) {
    buf.poly(pts, base);
}

function gem(buf, x, y, r, ramp) {
    buf.circle(x, y, r, ramp[0], true);
    buf.circle(x, y, r * 0.72, ramp[1], true);
    buf.circle(x - r * 0.2, y - r * 0.2, r * 0.42, ramp[2], true);
    buf.set(Math.round(x - r * 0.3), Math.round(y - r * 0.35), ramp[3] ?? ramp[2]);
}

/* ─── weapons ────────────────────────────────────────────────────── */

const icSparks = icon((b) => {
    // mini lantern
    b.rect(7, 8, 8, 10, P.brass[1]);
    b.rect(8, 9, 6, 8, P.amber[2]);
    b.rect(9, 10, 4, 6, P.amber[4]);
    b.set(11, 12, P.amber[5]);
    b.rect(6, 7, 10, 2, P.brass[2]);
    b.rect(6, 18, 10, 2, P.brass[1]);
    b.line(9, 7, 11, 3, P.brass[2]);
    b.line(13, 7, 11, 3, P.brass[2]);
    b.set(11, 2, P.brass[3]);
    // sparks flying out
    for (const [x, y, c] of [[18, 5, P.amber[5]], [19, 10, P.amber[3]], [17, 14, P.amber[4]], [4, 4, P.amber[3]], [3, 11, P.amber[2]]]) {
        b.set(x, y, c); b.set(x + 1, y - 1, c, 0.7); b.set(x - 1, y + 1, c, 0.5);
    }
}, { rim: P.amber[4], seed: 11 });

const icBlades = icon((b) => {
    for (const s of [-1, 1]) {
        for (let i = 0; i < 14; i++) {
            const t = i / 13;
            const x = Math.round(C + s * (2 + t * 8));
            const y = Math.round(C + (t - 0.5) * 16 * s);
            b.set(x, y, P.stone[3]); b.set(x + s, y, P.stone[4]); b.set(x - s, y, P.stone[1]);
            b.set(x, y + 1, P.stone[2]); b.set(x + s, y + 1, P.stone[3]);
        }
    }
    gem(b, C, C, 2.6, P.gold);
    b.line(C - 6, C + 6, C + 6, C - 6, P.stone[2]);
    b.line(C - 5, C + 7, C + 7, C - 5, P.stone[1]);
}, { rim: P.stone[4], seed: 13 });

const icNova = icon((b, f) => {
    for (let r = 9; r >= 3; r -= 3) {
        for (let i = 0; i < 90; i++) {
            const a = (i / 90) * 6.283;
            b.set(Math.round(C + Math.cos(a) * r), Math.round(C + Math.sin(a) * r), r === 9 ? P.amber[1] : r === 6 ? P.amber[2] : P.amber[4], 0.95);
        }
    }
    gem(b, C, C, 3, P.amber);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + 0.4;
        b.line(Math.round(C + Math.cos(a) * 9), Math.round(C + Math.sin(a) * 9), Math.round(C + Math.cos(a) * 11), Math.round(C + Math.sin(a) * 11), P.amber[3], 0.8);
    }
}, { rim: P.amber[4], seed: 17, noOutline: false });

const icRunes = icon((b) => {
    for (let i = 0; i < 100; i++) {
        const a = (i / 100) * 6.283;
        b.set(Math.round(C + Math.cos(a) * 8.5), Math.round(C + Math.sin(a) * 8.5), P.violet[2]);
        b.set(Math.round(C + Math.cos(a) * 6), Math.round(C + Math.sin(a) * 6), P.violet[1], 0.8);
    }
    // glyph
    b.vline(C, 5, 12, P.violet[4]);
    b.hline(C - 4, 8, 8, P.violet[3]);
    b.line(C - 4, 15, C, 11, P.violet[3]);
    b.line(C + 4, 15, C, 11, P.violet[3]);
    b.set(C, 4, P.violet[4]);
}, { rim: P.violet[4], seed: 19 });

const icLance = icon((b) => {
    for (let i = 0; i < 16; i++) {
        const x = 3 + i, y = 18 - i;
        b.set(x, y, P.cyan[2]); b.set(x, y - 1, P.cyan[3]); b.set(x + 1, y, P.cyan[1]);
    }
    b.poly([[17, 5], [21, 1], [20, 6], [18, 8]], P.cyan[3]);
    b.line(6, 13, 9, 16, P.cyan[4]);
    b.set(19, 3, P.cyan[4]);
    b.line(8, 17, 11, 14, P.cyan[4], 0.7);
    b.set(4, 19, P.cyan[1]);
}, { rim: P.cyan[4], seed: 23 });

const icFlask = icon((b) => {
    b.rect(9, 2, 4, 3, P.wood[2]);
    b.rect(9, 5, 4, 2, P.bone[1], 0.7);
    b.ellipse(11, 13, 6.4, 6, 0x2a0d16);
    b.ellipse(11, 13, 5.2, 5, P.ember[1]);
    b.ellipse(11, 14, 3.6, 3.4, P.amber[2]);
    b.ellipse(10, 12, 1.8, 1.6, P.amber[4]);
    // flame above
    b.poly([[11, 0], [13, 4], [11, 3], [9, 4]], P.amber[3]);
    b.set(11, 2, P.amber[5]);
}, { rim: P.amber[4], seed: 29 });

/* ─── evolutions ─────────────────────────────────────────────────── */

const icSolar = icon((b) => {
    gem(b, C, C, 5, P.gold);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.283;
        const r0 = 6.4, r1 = i % 2 ? 8.6 : 10.4;
        b.line(Math.round(C + Math.cos(a) * r0), Math.round(C + Math.sin(a) * r0),
            Math.round(C + Math.cos(a) * r1), Math.round(C + Math.sin(a) * r1), i % 2 ? P.amber[3] : P.gold[3]);
        b.set(Math.round(C + Math.cos(a) * r1), Math.round(C + Math.sin(a) * r1), P.amber[5]);
    }
}, { rim: P.amber[5], seed: 31 });

const icDawnblade = icon((b) => {
    // radiant sword
    b.poly([[11, 1], [13, 4], [12, 14], [11, 16], [10, 14], [9, 4]], P.stone[4]);
    b.poly([[11, 1], [12, 4], [11.4, 14], [11, 16]], P.bone[3]);
    b.rect(6, 15, 10, 2, P.gold[2]);
    b.rect(10, 17, 2, 4, P.wood[2]);
    b.set(11, 20, P.gold[2]);
    for (let i = 0; i < 6; i++) {
        const a = -1.2 + i * 0.48;
        b.line(Math.round(C + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 7), Math.round(C + Math.cos(a) * 10), Math.round(9 + Math.sin(a) * 10), P.gold[3], 0.75);
    }
}, { rim: P.gold[4], seed: 37 });

const icAshstorm = icon((b) => {
    for (let i = 0; i < 3; i++) {
        const r = 4 + i * 3;
        for (let a = 0; a < 5.2; a += 0.1) {
            const ang = a + i * 1.4;
            b.set(Math.round(C + Math.cos(ang) * r), Math.round(C + Math.sin(ang) * r * 0.8),
                i === 0 ? P.amber[4] : i === 1 ? P.ember[2] : P.violet[2], 0.9);
        }
    }
    for (let i = 0; i < 8; i++) {
        const a = hash2(i, 3, 7) * 6.283, r = 3 + hash2(i, 5, 9) * 7;
        b.set(Math.round(C + Math.cos(a) * r), Math.round(C + Math.sin(a) * r), i % 2 ? P.amber[3] : P.violet[3], 0.85);
    }
    gem(b, C, C, 2.2, P.amber);
}, { rim: P.amber[3], seed: 41 });

/* ─── passives ───────────────────────────────────────────────────── */

const icPower = icon((b) => {
    // blade + up chevron
    b.poly([[11, 2], [14, 8], [12, 8], [12, 16], [10, 16], [10, 8], [8, 8]], P.blood[2]);
    b.poly([[11, 2], [12.4, 8], [11.4, 16], [11, 16]], P.blood[3]);
    b.rect(7, 16, 8, 2, P.stone[2]);
    b.rect(10, 18, 2, 3, P.wood[2]);
    b.line(4, 12, 7, 8, P.amber[3]); b.line(7, 8, 4, 4, P.amber[3]);
    b.line(18, 12, 15, 8, P.amber[3]); b.line(15, 8, 18, 4, P.amber[3]);
}, { rim: P.blood[3], seed: 43 });

const icHaste = icon((b) => {
    for (let i = 0; i < 100; i++) {
        const a = (i / 100) * 6.283;
        b.set(Math.round(C + Math.cos(a) * 8), Math.round(C + Math.sin(a) * 8), P.stone[3]);
        b.set(Math.round(C + Math.cos(a) * 7), Math.round(C + Math.sin(a) * 7), P.stone[1]);
    }
    b.circle(C, C, 6.4, P.uiDark[1], true);
    b.line(C, C, C, 6, P.amber[4]); b.line(C, C, C + 4, C + 1, P.amber[4]);
    b.set(C, C, P.gold[3]);
    // speed lines
    b.hline(1, 8, 4, P.cyan[3], 0.8); b.hline(0, 12, 5, P.cyan[3], 0.6); b.hline(1, 16, 4, P.cyan[3], 0.7);
    b.rect(9, 1, 4, 2, P.stone[2]);
}, { rim: P.cyan[4], seed: 47 });

const icSpeed = icon((b) => {
    // winged boot
    b.poly([[7, 7], [14, 7], [15, 14], [17, 16], [17, 19], [6, 19], [6, 11]], P.cloak[3]);
    b.poly([[7, 7], [12, 7], [12.6, 14], [7, 14]], P.cloak[4]);
    b.hline(7, 10, 6, P.cloak[1], 0.7);
    b.hline(7, 13, 7, P.cloak[1], 0.7);
    b.rect(5, 19, 13, 2, P.wood[2]);
    b.rect(5, 20, 13, 1, P.wood[0]);
    b.hline(7, 16, 8, P.amber[3]);
    // wing
    for (let i = 0; i < 4; i++) {
        b.thickLine(6 - i, 8 + i * 2, 1 + i, 5 + i * 3, 1, i % 2 ? P.bone[3] : P.bone[2]);
    }
    b.hline(18, 9, 4, P.cyan[3], 0.8);
    b.hline(19, 13, 3, P.cyan[3], 0.6);
    b.hline(18, 17, 4, P.cyan[2], 0.5);
}, { rim: P.cyan[4], seed: 53 });

const heartShape = (b, ox, oy, ramp) => {
    b.circle(ox + 4, oy + 4, 3.6, ramp[1], true);
    b.circle(ox + 11, oy + 4, 3.6, ramp[1], true);
    b.poly([[ox + 0.6, oy + 5], [ox + 14.4, oy + 5], [ox + 7.5, oy + 14]], ramp[1]);
    b.circle(ox + 3.4, oy + 3.4, 2, ramp[2], true);
    b.poly([[ox + 2, oy + 5], [ox + 13, oy + 5], [ox + 7.5, oy + 12.4]], ramp[2], 0.5);
    b.set(Math.round(ox + 3), Math.round(oy + 2.6), ramp[3] || ramp[2]);
};

const icVitality = icon((b) => {
    heartShape(b, 3, 4, P.hpRed);
    b.line(12, 3, 15, 0, P.ghost[2], 0.7);
    b.set(16, 2, P.ghost[3], 0.7);
    b.set(18, 6, P.ghost[2], 0.6);
}, { rim: P.blood[3], seed: 59 });

const icCrit = icon((b) => {
    // eye + crosshair
    b.ellipse(C, C, 9, 5.4, P.stone[1]);
    b.ellipse(C, C, 7.6, 4.4, P.bone[2]);
    b.circle(C, C, 3.2, P.cyan[1], true);
    b.circle(C, C, 1.8, P.night[0], true);
    b.set(C - 1, C - 1, P.cyan[4]);
    b.line(C - 10, C, C - 6, C, P.amber[3]); b.line(C + 6, C, C + 10, C, P.amber[3]);
    b.line(C, C - 8, C, C - 5, P.amber[3]); b.line(C, C + 5, C, C + 8, P.amber[3]);
}, { rim: P.amber[4], seed: 61 });

const icMagnet = icon((b) => {
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.04) {
        const x = Math.round(C + Math.cos(a) * 7), y = Math.round(C + 2 + Math.sin(a) * 7);
        b.rect(x - 1, y, 3, 3, P.stone[3]);
        b.rect(x - 1, y + 2, 3, 2, P.stone[1]);
    }
    b.rect(3, 10, 4, 7, P.blood[2]);
    b.rect(15, 10, 4, 7, P.blood[2]);
    b.rect(3, 15, 4, 2, P.stone[3]);
    b.rect(15, 15, 4, 2, P.stone[3]);
    b.rect(4, 11, 1, 4, P.blood[3]);
    for (let i = 0; i < 3; i++) {
        b.hline(C - 4 - i * 2, 4 - i, 9 + i * 4, P.cyan[3], 0.75 - i * 0.2);
    }
}, { rim: P.cyan[4], seed: 67 });

const icArea = icon((b) => {
    for (const [r, c] of [[9, P.violet[1]], [6.4, P.violet[2]], [3.8, P.violet[3]]]) {
        for (let i = 0; i < 110; i++) {
            const a = (i / 110) * 6.283;
            b.set(Math.round(C + Math.cos(a) * r), Math.round(C + Math.sin(a) * r), c);
        }
    }
    gem(b, C, C, 2, P.amber);
    b.set(C, 1, P.violet[4]); b.set(C, 21, P.violet[4]); b.set(1, C, P.violet[4]); b.set(21, C, P.violet[4]);
}, { rim: P.violet[4], seed: 71 });

const icMultishot = icon((b) => {
    for (const [dx, dy] of [[0, -1], [-3.6, -0.4], [3.6, -0.4]]) {
        const x0 = C + dx * 1.4, y0 = 20 + dy * 1.2;
        const x1 = C + dx * 2.6, y1 = 4 + dy * 2;
        b.thickLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 1, P.wood[2]);
        // head
        for (let k = 0; k < 3; k++) {
            b.set(Math.round(x1 + (dx * 0.3) - k * 0.6), Math.round(y1 - 3 + k), P.bone[2]);
            b.set(Math.round(x1 + (dx * 0.3) + k * 0.6), Math.round(y1 - 3 + k), P.bone[2]);
        }
        b.set(Math.round(x1 + dx * 0.4), Math.round(y1 - 4), P.amber[3]);
        // fletching
        b.line(Math.round(x0 - 2), Math.round(y0 + 1), Math.round(x0), Math.round(y0 - 2), P.bone[1]);
        b.line(Math.round(x0 + 2), Math.round(y0 + 1), Math.round(x0), Math.round(y0 - 2), P.bone[1]);
    }
}, { rim: P.amber[3], seed: 73 });

const icCooldown = icon((b) => {
    // hourglass
    b.rect(5, 2, 12, 2, P.brass[2]);
    b.rect(5, 18, 12, 2, P.brass[2]);
    b.poly([[6, 4], [16, 4], [12, 10], [12, 12], [16, 18], [6, 18], [10, 12], [10, 10]], P.cyan[0]);
    b.poly([[7, 5], [15, 5], [11.4, 10.4], [10.6, 10.4]], P.cyan[2]);
    b.poly([[8, 17], [14, 17], [11.4, 13], [10.6, 13]], P.cyan[2]);
    b.vline(C, 11, 3, P.cyan[3]);
    b.set(C, 14, P.cyan[4]);
    b.vline(5, 4, 14, P.stone[1]); b.vline(17, 4, 14, P.stone[1]);
}, { rim: P.cyan[4], seed: 79 });

const icGreed = icon((b) => {
    for (const [x, y] of [[7, 16], [13, 16], [10, 13], [16, 13], [10, 8]]) {
        b.ellipse(x, y, 4.4, 2.6, P.gold[1]);
        b.ellipse(x, y - 0.6, 3.4, 1.8, P.gold[2]);
        b.ellipse(x - 1, y - 1.2, 1.4, 0.8, P.gold[3]);
    }
    b.set(10, 4, P.gold[4]);
    b.line(10, 5, 10, 7, P.gold[3], 0.7);
    b.set(17, 5, P.gold[3], 0.8); b.set(4, 7, P.gold[3], 0.7);
}, { rim: P.gold[4], seed: 83 });

/* ─── altar / meta ───────────────────────────────────────────────── */

const icShield = icon((b) => {
    b.poly([[4, 3], [18, 3], [18, 11], [11, 20], [4, 11]], P.stone[2]);
    b.poly([[5.4, 4.4], [16.6, 4.4], [16.6, 10.6], [11, 18], [5.4, 10.6]], P.cloak[2]);
    b.poly([[5.4, 4.4], [11, 4.4], [11, 18], [5.4, 10.6]], P.cloak[3], );
    b.vline(11, 5, 12, P.gold[2]);
    b.hline(7, 9, 9, P.gold[2]);
    gem(b, 11, 9, 1.6, P.gold);
}, { rim: P.gold[3], seed: 89 });

const icSword = icon((b) => {
    b.poly([[11, 1], [13, 3], [12.2, 14], [11, 16], [9.8, 14], [9, 3]], P.stone[4]);
    b.poly([[11, 1], [12, 3], [11.4, 14], [11, 16]], P.bone[3]);
    b.rect(5, 15, 12, 2, P.gold[2]);
    b.rect(6, 15, 10, 1, P.gold[3]);
    b.rect(10, 17, 2, 4, P.wood[2]);
    b.set(11, 21, P.gold[2]);
}, { rim: P.stone[4], seed: 97 });

const icCoinBag = icon((b) => {
    b.blob(C, 14, 7.4, 6.4, P.wood[2], { seed: 5, jitter: 0.14, lobes: 3 });
    b.blob(C - 2, 12, 4, 3.4, P.wood[3], { seed: 9, jitter: 0.14, lobes: 3 });
    b.poly([[8, 6], [14, 6], [13, 9], [9, 9]], P.wood[1]);
    b.line(8, 6, 6, 3, P.wood[2]); b.line(14, 6, 16, 3, P.wood[2]);
    b.rect(8, 8, 6, 2, P.gold[1]);
    b.ellipse(C, 14, 2.4, 2, P.gold[2]);
    b.set(C - 1, 13, P.gold[3]);
    b.set(C, 14, P.gold[0]);
}, { rim: P.gold[3], seed: 101 });

const icRevive = icon((b) => {
    // phoenix-ish ankh
    b.vline(C, 8, 12, P.gold[2]);
    b.hline(7, 11, 8, P.gold[2]);
    for (let i = 0; i < 60; i++) {
        const a = (i / 60) * 6.283;
        b.set(Math.round(C + Math.cos(a) * 4), Math.round(5 + Math.sin(a) * 4), P.gold[2]);
    }
    b.set(C, 5, P.amber[4]);
    b.line(6, 16, 3, 12, P.amber[2]); b.line(16, 16, 19, 12, P.amber[2]);
    b.line(4, 18, 2, 15, P.amber[1]); b.line(18, 18, 20, 15, P.amber[1]);
    b.set(C, 20, P.gold[3]);
}, { rim: P.amber[4], seed: 103 });

const icTome = icon((b) => {
    b.rect(3, 4, 16, 15, P.wood[1]);
    b.rect(4, 5, 14, 13, P.parchment[1]);
    b.rect(5, 6, 12, 11, P.parchment[2]);
    b.rect(3, 4, 3, 15, P.wood[2]);
    for (let y = 8; y < 16; y += 2) { b.hline(7, y, 8, P.stone[1], 0.5); }
    gem(b, 15, 11, 2.4, P.violet);
    b.set(19, 6, P.violet[3], 0.8); b.set(20, 14, P.violet[2], 0.7);
    b.line(6, 3, 6, 20, P.gold[1], 0.5);
}, { rim: P.violet[3], seed: 107 });

const icDrop = icon((b) => {
    b.poly([[11, 2], [16, 12], [16, 16], [6, 16], [6, 12]], P.cyan[1]);
    b.poly([[11, 4], [14.6, 12], [14.6, 15], [7.4, 15], [7.4, 12]], P.cyan[2]);
    b.poly([[11, 6], [13, 12], [13, 14], [9, 14], [9, 12]], P.cyan[3]);
    b.set(10, 9, P.cyan[4]);
    b.rect(5, 16, 12, 3, P.cyan[1]);
    b.rect(6, 17, 10, 1, P.cyan[2]);
    b.set(3, 13, P.cyan[3], 0.6); b.set(19, 12, P.cyan[3], 0.6);
}, { rim: P.cyan[4], seed: 109 });

const icLuck = icon((b) => {
    // four-leaf clover + spark
    for (const [dx, dy] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) {
        b.ellipse(C + dx, 12 + dy, 3.4, 3.4, P.ghost[1]);
        b.ellipse(C + dx - 0.6, 11.4 + dy, 2, 2, P.ghost[2]);
    }
    b.line(C, 12, C + 1, 20, P.moss[2]);
    b.set(C, 20, P.moss[1]);
    b.set(C, 3, P.gold[4]); b.set(C - 1, 4, P.gold[3]); b.set(C + 1, 4, P.gold[3]); b.set(C, 5, P.gold[3]);
}, { rim: P.ghost[3], seed: 113 });

/* ─── hud / menu icons ───────────────────────────────────────────── */

const icGold = icon((b) => {
    b.ellipse(C, C + 1, 8, 7.4, P.gold[1]);
    b.ellipse(C, C, 7, 6.4, P.gold[2]);
    b.ellipse(C - 1.4, C - 1.6, 4, 3.4, P.gold[3]);
    b.set(C - 2, C - 2.4, P.gold[4]);
    // emblem: flame
    b.poly([[C, C - 3], [C + 2, C + 1], [C, C], [C - 2, C + 1]], P.gold[0]);
    b.set(C, C + 2, P.gold[1]);
}, { rim: P.gold[4], seed: 127 });

const icSkull = icon((b) => {
    b.ellipse(C, 9, 7.6, 7, P.bone[2]);
    b.ellipse(C - 2, 6, 4, 3, P.bone[3]);
    b.ellipse(C - 3.2, 10, 2.2, 2.6, P.night[0]);
    b.ellipse(C + 3.2, 10, 2.2, 2.6, P.night[0]);
    b.set(Math.round(C - 3.2), 10, P.blood[2]); b.set(Math.round(C + 3.2), 10, P.blood[2]);
    b.poly([[C - 1, 12], [C + 1, 12], [C, 14]], P.night[0]);
    b.rect(C - 4, 15, 8, 4, P.bone[1]);
    for (let x = C - 4; x < C + 4; x += 2) { b.vline(x, 15, 4, P.bone[0], 0.6); }
    b.hline(C - 4, 17, 8, P.night[0], 0.5);
}, { rim: P.bone[3], seed: 131 });

const icTimer = icon((b) => {
    for (let i = 0; i < 110; i++) {
        const a = (i / 110) * 6.283;
        b.set(Math.round(C + Math.cos(a) * 8), Math.round(C + 1 + Math.sin(a) * 8), P.stone[3]);
        b.set(Math.round(C + Math.cos(a) * 7), Math.round(C + 1 + Math.sin(a) * 7), P.stone[1]);
    }
    b.circle(C, C + 1, 6.4, P.uiDark[1], true);
    b.line(C, C + 1, C, C - 3, P.amber[4]);
    b.line(C, C + 1, C + 3, C + 3, P.amber[3]);
    b.set(C, C + 1, P.gold[3]);
    b.rect(9, 1, 4, 2, P.stone[2]);
    b.set(17, 4, P.stone[3]); b.set(18, 5, P.stone[2]);
}, { rim: P.amber[4], seed: 137 });

const icHeart = icon((b) => {
    heartShape(b, 2, 3, P.hpRed);
    b.set(6, 5, P.blood[4]); b.set(7, 4, P.blood[4]);
}, { rim: P.blood[3], seed: 139 });

const icChest = icon((b) => {
    b.rect(3, 10, 16, 8, P.wood[1]);
    b.rect(3, 10, 16, 2, P.wood[2]);
    for (let y = 4; y <= 10; y++) {
        const hw = 8 - Math.pow((10 - y) / 6, 2) * 1.2;
        for (let x = Math.round(C - hw); x <= Math.round(C + hw); x++) { b.set(x, y, y < 6 ? P.wood[2] : P.wood[1]); }
    }
    b.rect(6, 4, 2, 14, P.brass[1]); b.rect(14, 4, 2, 14, P.brass[1]);
    b.rect(9, 9, 4, 5, P.brass[2]);
    b.rect(10, 11, 2, 2, P.gold[3]);
}, { rim: P.gold[3], seed: 149 });

const icDash = icon((b) => {
    b.poly([[8, 4], [18, 11], [8, 18], [10, 11]], P.cyan[2]);
    b.poly([[9, 6], [16, 11], [9, 16], [10.6, 11]], P.cyan[3]);
    b.set(15, 11, P.cyan[4]);
    for (let i = 0; i < 3; i++) {
        b.hline(1 + i * 2, 6 + i * 5, 5 - i, P.cyan[1], 0.7 - i * 0.15);
    }
}, { rim: P.cyan[4], seed: 151 });

const icSoundOn = icon((b) => {
    b.poly([[3, 8], [7, 8], [12, 3], [12, 19], [7, 14], [3, 14]], P.stone[3]);
    b.poly([[4, 9], [7, 9], [11, 5], [11, 17], [7, 13], [4, 13]], P.stone[2]);
    for (let i = 0; i < 3; i++) {
        const r = 4 + i * 2.4;
        for (let a = -0.8; a <= 0.8; a += 0.1) {
            b.set(Math.round(12 + Math.cos(a) * r), Math.round(C + Math.sin(a) * r), P.amber[3], 0.9 - i * 0.22);
        }
    }
}, { rim: P.amber[4], seed: 157 });

const icSoundOff = icon((b) => {
    b.poly([[3, 8], [7, 8], [12, 3], [12, 19], [7, 14], [3, 14]], P.stone[2]);
    b.poly([[4, 9], [7, 9], [11, 5], [11, 17], [7, 13], [4, 13]], P.stone[1]);
    b.line(15, 7, 20, 15, P.blood[3]); b.line(20, 7, 15, 15, P.blood[3]);
    b.line(15, 7, 20, 15, P.blood[2], 0.5);
}, { rim: P.blood[3], seed: 163 });

const icGear = icon((b) => {
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283;
        b.rect(Math.round(C + Math.cos(a) * 8) - 2, Math.round(C + Math.sin(a) * 8) - 2, 4, 4, P.stone[2]);
    }
    b.circle(C, C, 7, P.stone[2], true);
    b.circle(C, C, 5.6, P.stone[3], true);
    b.circle(C, C, 2.6, P.uiDark[1], true);
    b.set(C - 2, C - 3, P.stone[4], 0.7);
}, { rim: P.stone[4], seed: 167 });

const icPlay = icon((b) => {
    b.poly([[5, 2], [20, 11], [5, 20]], P.ghost[2]);
    b.poly([[7, 5], [17, 11], [7, 17]], P.ghost[3]);
    b.set(8, 8, 0xffffff, 0.8);
}, { rim: P.ghost[3], seed: 173 });

const icPause = icon((b) => {
    b.rect(4, 3, 5, 16, P.stone[3]);
    b.rect(13, 3, 5, 16, P.stone[3]);
    b.rect(5, 4, 2, 14, P.stone[4]);
    b.rect(14, 4, 2, 14, P.stone[4]);
}, { rim: P.stone[4], seed: 179 });

const icArrow = icon((b) => {
    b.hline(2, C, 14, P.stone[3]);
    b.hline(2, C - 1, 14, P.stone[4]);
    b.poly([[14, 5], [21, C], [14, 17]], P.amber[3]);
    b.poly([[15, 7], [19, C], [15, 15]], P.amber[4]);
    b.set(18, C, P.amber[5]);
}, { rim: P.amber[4], seed: 181 });

const icStar = icon((b) => {
    for (let i = 0; i < 5; i++) {
        const a1 = (i / 5) * 6.283 - 1.5708;
        const a2 = ((i + 0.5) / 5) * 6.283 - 1.5708;
        const a3 = ((i + 1) / 5) * 6.283 - 1.5708;
        b.poly([[C, C], [Math.round(C + Math.cos(a1) * 9), Math.round(C + Math.sin(a1) * 9)],
            [Math.round(C + Math.cos(a2) * 3.8), Math.round(C + Math.sin(a2) * 3.8)],
            [Math.round(C + Math.cos(a3) * 9), Math.round(C + Math.sin(a3) * 9)]], i % 2 ? P.gold[2] : P.gold[3]);
    }
    b.set(C, C, P.gold[4]);
}, { rim: P.gold[4], seed: 191 });

const icLock = icon((b) => {
    for (let i = 0; i < 70; i++) {
        const a = Math.PI + (i / 70) * Math.PI;
        b.set(Math.round(C + Math.cos(a) * 5), Math.round(9 + Math.sin(a) * 5), P.stone[2]);
        b.set(Math.round(C + Math.cos(a) * 4), Math.round(9 + Math.sin(a) * 4), P.stone[1]);
    }
    b.rect(4, 9, 14, 10, P.stone[2]);
    b.rect(5, 10, 12, 8, P.stone[3]);
    b.set(C, 13, P.night[0]); b.vline(C, 13, 3, P.night[0]);
    b.set(C - 2, 10, P.stone[4], 0.6);
}, { rim: P.stone[4], seed: 193 });

const icTrophy = icon((b) => {
    b.poly([[4, 3], [18, 3], [16, 10], [13, 13], [9, 13], [6, 10]], P.gold[2]);
    b.poly([[5.4, 4], [11, 4], [10, 12], [8, 12]], P.gold[3]);
    b.rect(9, 13, 4, 3, P.gold[1]);
    b.rect(6, 17, 10, 3, P.stone[2]);
    b.rect(6, 17, 10, 1, P.stone[3]);
    for (let i = 0; i < 40; i++) {
        const a = Math.PI * 0.15 + (i / 40) * Math.PI * 0.7;
        b.set(Math.round(3 + Math.cos(a + 1.6) * 4), Math.round(6 + Math.sin(a + 1.6) * 4), P.gold[1]);
        b.set(Math.round(19 - Math.cos(a + 1.6) * 4), Math.round(6 + Math.sin(a + 1.6) * 4), P.gold[1]);
    }
    b.set(11, 7, P.gold[4]);
}, { rim: P.gold[4], seed: 197 });

const icClose = icon((b) => {
    b.line(4, 4, 18, 18, P.blood[2]); b.line(18, 4, 4, 18, P.blood[2]);
    b.line(5, 4, 18, 17, P.blood[3]); b.line(17, 4, 4, 17, P.blood[3]);
    b.set(4, 4, P.blood[4]); b.set(18, 4, P.blood[4]);
    b.set(4, 18, P.blood[4]); b.set(18, 18, P.blood[4]);
}, { rim: P.blood[3], seed: 199 });

const icCrown = icon((b) => {
    b.rect(2, 13, 18, 4, P.gold[1]);
    b.rect(2, 13, 18, 2, P.gold[2]);
    b.poly([[2, 13], [5, 4], [8, 11], [11, 2], [14, 11], [17, 4], [20, 13]], P.gold[2]);
    b.poly([[3, 13], [5.4, 6], [8, 12], [11, 4], [11, 13]], P.gold[3]);
    b.set(11, 3, P.blood[3]); b.set(5, 5, P.cyan[3]); b.set(17, 5, P.violet[3]);
    b.set(11, 15, P.gold[4]);
}, { rim: P.gold[4], seed: 211 });

const icLantern = icon((b) => {
    b.line(C, 1, C, 3, P.brass[2]);
    b.rect(6, 3, 10, 2, P.brass[2]);
    b.rect(5, 5, 12, 12, P.brass[1]);
    b.rect(6, 6, 10, 10, P.amber[2]);
    b.rect(7, 7, 8, 8, P.amber[4]);
    b.set(C, 11, P.amber[5]);
    b.vline(5, 5, 12, P.brass[2]); b.vline(16, 5, 12, P.brass[0]);
    b.rect(5, 17, 12, 2, P.brass[1]);
    b.set(4, 9, P.amber[5], 0.5); b.set(18, 9, P.amber[5], 0.4);
}, { rim: P.amber[5], seed: 223 });

const icWhip = icon((b) => {
    // curved lash with a glowing tip
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = Math.round(3 + t * 14);
        const y = Math.round(18 - Math.sin(t * 2.2) * 12 - t * 2);
        b.set(x, y, P.bone[1]); b.set(x, y + 1, P.wood[2]);
        if (i > 12) { b.set(x, y - 1, P.amber[3], 0.8); }
    }
    b.set(18, 4, P.amber[4]); b.set(19, 3, P.amber[5]); b.set(17, 3, P.amber[3]);
    b.set(19, 4, P.amber[3], 0.7); b.set(18, 2, P.amber[3], 0.7);
    b.rect(2, 17, 3, 4, P.wood[2]);
    b.set(2, 17, P.wood[3]);
}, { rim: P.amber[4], seed: 227 });

const icBoomerang = icon((b) => {
    // V-shaped runic blade
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        b.set(Math.round(3 + t * 8), Math.round(4 + t * 7), P.stone[3]);
        b.set(Math.round(3 + t * 8), Math.round(5 + t * 7), P.stone[2]);
        b.set(Math.round(19 - t * 8), Math.round(4 + t * 7), P.stone[3]);
        b.set(Math.round(19 - t * 8), Math.round(5 + t * 7), P.stone[1]);
    }
    b.set(11, 11, P.gold[2]); b.set(11, 12, P.gold[1]);
    b.set(3, 3, P.violet[3]); b.set(19, 3, P.violet[3]);
    b.set(4, 4, P.violet[2], 0.7); b.set(18, 4, P.violet[2], 0.7);
    b.set(11, 8, P.violet[4], 0.9);
}, { rim: P.violet[4], seed: 229 });

export const UI_SPRITES = [
    { key: 'ic_sparks', w: W, h: H, frames: ['ic_sparks'], paint: icSparks },
    { key: 'ic_blades', w: W, h: H, frames: ['ic_blades'], paint: icBlades },
    { key: 'ic_nova', w: W, h: H, frames: ['ic_nova'], paint: icNova },
    { key: 'ic_runes', w: W, h: H, frames: ['ic_runes'], paint: icRunes },
    { key: 'ic_lance', w: W, h: H, frames: ['ic_lance'], paint: icLance },
    { key: 'ic_flask', w: W, h: H, frames: ['ic_flask'], paint: icFlask },
    { key: 'ic_solar', w: W, h: H, frames: ['ic_solar'], paint: icSolar },
    { key: 'ic_dawnblade', w: W, h: H, frames: ['ic_dawnblade'], paint: icDawnblade },
    { key: 'ic_ashstorm', w: W, h: H, frames: ['ic_ashstorm'], paint: icAshstorm },
    { key: 'ic_power', w: W, h: H, frames: ['ic_power'], paint: icPower },
    { key: 'ic_haste', w: W, h: H, frames: ['ic_haste'], paint: icHaste },
    { key: 'ic_speed', w: W, h: H, frames: ['ic_speed'], paint: icSpeed },
    { key: 'ic_vitality', w: W, h: H, frames: ['ic_vitality'], paint: icVitality },
    { key: 'ic_crit', w: W, h: H, frames: ['ic_crit'], paint: icCrit },
    { key: 'ic_magnet', w: W, h: H, frames: ['ic_magnet'], paint: icMagnet },
    { key: 'ic_area', w: W, h: H, frames: ['ic_area'], paint: icArea },
    { key: 'ic_multishot', w: W, h: H, frames: ['ic_multishot'], paint: icMultishot },
    { key: 'ic_cooldown', w: W, h: H, frames: ['ic_cooldown'], paint: icCooldown },
    { key: 'ic_greed', w: W, h: H, frames: ['ic_greed'], paint: icGreed },
    { key: 'ic_shield', w: W, h: H, frames: ['ic_shield'], paint: icShield },
    { key: 'ic_sword', w: W, h: H, frames: ['ic_sword'], paint: icSword },
    { key: 'ic_coinbag', w: W, h: H, frames: ['ic_coinbag'], paint: icCoinBag },
    { key: 'ic_revive', w: W, h: H, frames: ['ic_revive'], paint: icRevive },
    { key: 'ic_tome', w: W, h: H, frames: ['ic_tome'], paint: icTome },
    { key: 'ic_drop', w: W, h: H, frames: ['ic_drop'], paint: icDrop },
    { key: 'ic_luck', w: W, h: H, frames: ['ic_luck'], paint: icLuck },
    { key: 'ic_gold', w: W, h: H, frames: ['ic_gold'], paint: icGold },
    { key: 'ic_skull', w: W, h: H, frames: ['ic_skull'], paint: icSkull },
    { key: 'ic_timer', w: W, h: H, frames: ['ic_timer'], paint: icTimer },
    { key: 'ic_heart', w: W, h: H, frames: ['ic_heart'], paint: icHeart },
    { key: 'ic_chest', w: W, h: H, frames: ['ic_chest'], paint: icChest },
    { key: 'ic_dash', w: W, h: H, frames: ['ic_dash'], paint: icDash },
    { key: 'ic_sound_on', w: W, h: H, frames: ['ic_sound_on'], paint: icSoundOn },
    { key: 'ic_sound_off', w: W, h: H, frames: ['ic_sound_off'], paint: icSoundOff },
    { key: 'ic_gear', w: W, h: H, frames: ['ic_gear'], paint: icGear },
    { key: 'ic_play', w: W, h: H, frames: ['ic_play'], paint: icPlay },
    { key: 'ic_pause', w: W, h: H, frames: ['ic_pause'], paint: icPause },
    { key: 'ic_arrow', w: W, h: H, frames: ['ic_arrow'], paint: icArrow },
    { key: 'ic_star', w: W, h: H, frames: ['ic_star'], paint: icStar },
    { key: 'ic_lock', w: W, h: H, frames: ['ic_lock'], paint: icLock },
    { key: 'ic_trophy', w: W, h: H, frames: ['ic_trophy'], paint: icTrophy },
    { key: 'ic_close', w: W, h: H, frames: ['ic_close'], paint: icClose },
    { key: 'ic_crown', w: W, h: H, frames: ['ic_crown'], paint: icCrown },
    { key: 'ic_lantern', w: W, h: H, frames: ['ic_lantern'], paint: icLantern },
    { key: 'ic_whip', w: W, h: H, frames: ['ic_whip'], paint: icWhip },
    { key: 'ic_boomerang', w: W, h: H, frames: ['ic_boomerang'], paint: icBoomerang }
];

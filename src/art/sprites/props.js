import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   WORLD PROPS — the cursed forest dressing.
   Props are depth-sorted by Y at runtime, so each one is drawn standing on
   the BOTTOM row of its buffer (origin bottom-centre).
   Emissive bits (lanterns, mushrooms, crystals, runes) are deliberately
   over-bright: the bloom pass picks them up.
   ══════════════════════════════════════════════════════════════════════ */

function branch(buf, x0, y0, x1, y1, w, color, tip) {
    buf.thickLine(x0, y0, x1, y1, w, color);
    if (tip) { buf.set(x1, y1, tip); }
}

/* ─── dead tree ──────────────────────────────────────────────────── */
function paintTreeDead(buf, frame) {
    buf.clear();
    const bx = 18, by = 63;
    // trunk
    for (let y = 14; y <= by; y++) {
        const t = (y - 14) / (by - 14);
        const hw = 3 + t * 4 + Math.sin(t * 4) * 0.8;
        const lean = Math.sin(t * 1.6) * 2.4;
        for (let x = Math.round(bx - hw + lean); x <= Math.round(bx + hw + lean); x++) {
            let c = P.wood[1];
            if (x <= bx - hw + lean + 1.5) { c = P.wood[2]; }
            else if (x >= bx + hw + lean - 1.2) { c = P.wood[0]; }
            buf.set(x, y, c);
        }
    }
    // bark grain
    for (let i = 0; i < 26; i++) {
        const y = 16 + Math.floor(hash2(i, 3, 9) * 46);
        const x = Math.round(bx - 5 + hash2(i, 7, 2) * 10 + Math.sin((y - 14) / 48 * 1.6) * 2.4);
        buf.vline(x, y, 2 + Math.floor(hash2(i, 11, 5) * 4), P.wood[0], 0.5);
    }
    // roots
    buf.line(bx - 6, by, bx - 12, by - 2, P.wood[1]);
    buf.line(bx + 6, by, bx + 12, by - 2, P.wood[0]);
    buf.thickLine(bx - 4, by - 1, bx - 10, by, 2, P.wood[1]);
    buf.thickLine(bx + 4, by - 1, bx + 11, by, 2, P.wood[0]);
    // branches
    branch(buf, bx - 2, 26, bx - 14, 12, 2, P.wood[1], P.wood[2]);
    branch(buf, bx - 12, 14, bx - 17, 5, 1, P.wood[1]);
    branch(buf, bx - 10, 17, bx - 6, 8, 1, P.wood[2]);
    branch(buf, bx + 3, 22, bx + 15, 9, 2, P.wood[0], P.wood[1]);
    branch(buf, bx + 13, 11, bx + 17, 3, 1, P.wood[0]);
    branch(buf, bx + 9, 16, bx + 6, 6, 1, P.wood[1]);
    branch(buf, bx, 14, bx - 3, 2, 2, P.wood[2]);
    // hollow with something glowing inside
    buf.ellipse(bx + 1, 40, 3, 4.4, P.night[0]);
    buf.ellipse(bx + 1, 40, 2, 3.2, INK);
    if (frame % 2 === 0) {
        buf.set(bx, 39, P.amber[3]);
        buf.set(bx + 2, 39, P.amber[3]);
        buf.set(bx, 40, P.amber[4], 0.6);
        buf.set(bx + 2, 40, P.amber[4], 0.6);
    }
    // moss
    speckle(buf, bx - 8, 44, 16, 18, P.moss[1], 0.16, 13, 0.85);
    speckle(buf, bx - 16, 8, 12, 12, P.moss[2], 0.1, 17, 0.5);
    finish(buf, { lightAmount: 0.18, shadowAmount: 0.5, grain: 0.06, seed: 71 });
}

/* ─── pine ───────────────────────────────────────────────────────── */
function paintPine(buf, frame) {
    buf.clear();
    const cx = 16, by = 55;
    buf.rect(cx - 3, by - 12, 6, 12, P.wood[1]);
    buf.rect(cx - 3, by - 12, 2, 12, P.wood[2]);
    const layers = [[0, 26, 15], [8, 24, 12.5], [16, 22, 9.5], [24, 18, 6]];
    for (const [top, bottom, half] of layers) {
        for (let y = top + 2; y <= bottom + 2; y++) {
            const t = (y - top - 2) / (bottom - top);
            const hw = half * (0.35 + t * 0.75);
            for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
                let c = P.moss[1];
                if (x <= cx - hw + 1.6) { c = P.moss[2]; }
                else if (x >= cx + hw - 1.6) { c = P.night[1]; }
                if (t > 0.82) { c = mix(c, INK, 0.4); }
                buf.set(x, y, c);
            }
        }
        // needle tips + shadow under each layer for depth
        for (let x = Math.round(cx - half); x <= Math.round(cx + half); x += 2) {
            if (hash2(x, top, 5) < 0.6) { buf.set(x, bottom + 3, P.moss[2], 0.8); }
        }
        for (let x = Math.round(cx - half * 0.9); x <= Math.round(cx + half * 0.9); x++) {
            buf.set(x, bottom + 2, mix(P.moss[0], INK, 0.5), 0.85);
        }
    }
    speckle(buf, cx - 15, 2, 30, 50, P.moss[3], 0.05, 23, 0.6);
    // snow-free highlight on the lit side
    for (let y = 4; y < 40; y += 3) { buf.set(cx - 6 + Math.round(hash2(y, 1, 1) * 2), y, P.moss[3], 0.5); }
    finish(buf, { rimLight: P.moss[3], lightAmount: 0.2, shadowAmount: 0.5, grain: 0.05, seed: 79 });
}

/* ─── rocks ──────────────────────────────────────────────────────── */
function paintRock(w, h, seed) {
    return (b, frame) => {
        b.clear();
        const cx = w / 2, cy = h - h * 0.42;
        b.blob(cx, cy, w * 0.46, h * 0.42, P.stone[1], { seed, jitter: 0.2, lobes: 4 });
        // top facet (lit)
        b.blob(cx - w * 0.08, cy - h * 0.16, w * 0.3, h * 0.2, P.stone[2], { seed: seed + 3, jitter: 0.24, lobes: 3 });
        b.blob(cx - w * 0.12, cy - h * 0.24, w * 0.16, h * 0.1, P.stone[3], { seed: seed + 7, jitter: 0.2, lobes: 2 });
        // bottom shadow
        b.blob(cx + w * 0.1, cy + h * 0.2, w * 0.34, h * 0.16, P.stone[0], { seed: seed + 11, jitter: 0.2, lobes: 3 });
        // cracks
        b.line(Math.round(cx - w * 0.2), Math.round(cy - h * 0.1), Math.round(cx + w * 0.05), Math.round(cy + h * 0.18), P.stone[0], 0.8);
        b.line(Math.round(cx + w * 0.12), Math.round(cy - h * 0.22), Math.round(cx + w * 0.2), Math.round(cy), P.stone[0], 0.6);
        speckle(b, 0, 0, w, h, P.stone[2], 0.09, seed + 2, 0.7);
        // moss cap
        speckle(b, Math.round(cx - w * 0.4), Math.round(cy - h * 0.42), Math.round(w * 0.7), Math.round(h * 0.3), P.moss[2], 0.22, seed + 5, 0.9);
        finish(b, { lightAmount: 0.22, shadowAmount: 0.45, grain: 0.06, seed });
    };
}

/* ─── glowing mushrooms ──────────────────────────────────────────── */
function dome(b, x, y, rx, ry, c) {
    for (let j = -Math.ceil(ry); j <= 0; j++) {
        const t = j / ry;
        const hw = rx * Math.sqrt(Math.max(0, 1 - t * t));
        for (let i = Math.round(-hw); i <= Math.round(hw); i++) { b.set(x + i, y + j, c); }
    }
    b.hline(Math.round(x - rx), y, Math.round(rx * 2) + 1, mix(c, INK, 0.45));
    return b;
}

function paintMushrooms(buf, frame) {
    buf.clear();
    const glowOn = frame % 2 === 0;
    const caps = [[5, 11, 4.2, 3.6, P.cyan[1]], [12, 12, 3, 2.6, P.ghost[1]], [9, 8, 2.2, 2, P.cyan[2]]];
    for (const [x, y, rx, ry, c] of caps) {
        buf.rect(x - 1, y, 2, 4, P.bone[1]);
        buf.set(x - 1, y + 1, P.bone[2]);
        dome(buf, x, y, rx, ry, c);
        dome(buf, x - rx * 0.3, y - ry * 0.3, rx * 0.45, ry * 0.4, glowOn ? P.cyan[3] : P.cyan[2]);
        // gills
        buf.hline(x - Math.round(rx * 0.7), y + 1, Math.round(rx * 1.4), mix(c, INK, 0.5), 0.7);
        // spores
        if (glowOn) {
            buf.set(x + 3, y - 4, P.cyan[3], 0.7);
            buf.set(x - 3, y - 3, P.cyan[2], 0.5);
        }
    }
    // mossy base
    buf.ellipse(9, 15, 8, 2, P.moss[1]);
    speckle(buf, 1, 12, 16, 4, P.moss[2], 0.3, 3, 0.8);
    finish(buf, { rimLight: P.cyan[3], lightAmount: 0.4, shadowAmount: 0.3, grain: 0.04, seed: 91 });
}

/* ─── gravestone ─────────────────────────────────────────────────── */
function paintGrave(buf, frame) {
    buf.clear();
    // mound
    buf.ellipse(11, 26, 10, 3, P.dirt[1]);
    speckle(buf, 1, 23, 20, 6, P.dirt[2], 0.2, 5, 0.8);
    // stone
    for (let y = 4; y <= 25; y++) {
        for (let x = 4; x <= 17; x++) {
            const top = y < 8 ? Math.hypot(x - 10.5, y - 8) < 6.6 : true;
            if (!top) { continue; }
            let c = P.stone[1];
            if (x <= 5) { c = P.stone[2]; }
            if (x >= 16) { c = P.stone[0]; }
            if (y >= 23) { c = mix(c, INK, 0.4); }
            buf.set(x, y, c);
        }
    }
    // broken corner
    for (let i = 0; i < 4; i++) { buf.set(17 - i, 4 + i, INK, 0); }
    buf.poly([[14, 3], [18, 3], [18, 8], [16, 6]], P.stone[2]);
    // engraved cross
    buf.vline(10, 9, 9, P.stone[0]);
    buf.hline(7, 12, 7, P.stone[0]);
    buf.vline(11, 9, 9, P.stone[3], 0.35);
    // runes glowing faintly
    if (frame % 2 === 0) {
        buf.set(6, 18, P.violet[2], 0.9);
        buf.set(8, 20, P.violet[2], 0.7);
        buf.set(14, 18, P.violet[2], 0.8);
    }
    speckle(buf, 4, 4, 14, 22, P.stone[2], 0.08, 11, 0.6);
    speckle(buf, 4, 18, 14, 8, P.moss[1], 0.18, 19, 0.85);
    finish(buf, { lightAmount: 0.2, shadowAmount: 0.45, grain: 0.06, seed: 101 });
}

/* ─── lantern post (world light source) ──────────────────────────── */
function paintLanternPost(buf, frame) {
    buf.clear();
    const px = 9;
    // base stones
    buf.ellipse(px, 42, 7, 2.6, P.stone[1]);
    speckle(buf, px - 7, 39, 14, 6, P.stone[2], 0.25, 3, 0.7);
    // post
    buf.rect(px - 1, 8, 3, 34, 0x2b2438);
    buf.vline(px - 1, 8, 34, 0x3d3550);
    buf.vline(px + 1, 8, 34, 0x1a1526);
    // rivets
    for (let y = 12; y < 40; y += 6) { buf.set(px, y, 0x54496b); }
    // arm
    buf.hline(px, 7, 6, 0x2b2438);
    buf.set(px + 5, 8, 0x2b2438);
    // hanging lantern
    const lx = px + 5, ly = 10 + (frame % 2 === 0 ? 0 : 1);
    buf.vline(lx, 8, 2, 0x3d3550);
    buf.rect(lx - 3, ly, 7, 1, P.brass[1]);
    buf.rect(lx - 3, ly + 1, 1, 8, P.brass[1]);
    buf.rect(lx + 3, ly + 1, 1, 8, P.brass[0]);
    const g = frame === 0 ? P.amber[4] : frame === 1 ? P.amber[5] : frame === 2 ? P.amber[3] : P.amber[4];
    buf.rect(lx - 2, ly + 1, 5, 8, P.amber[2]);
    buf.rect(lx - 1, ly + 2, 3, 6, g);
    buf.set(lx, ly + 4, P.amber[5]);
    buf.set(lx - 1, ly + 3, P.amber[5], 0.8);
    buf.rect(lx - 3, ly + 9, 7, 1, P.brass[1]);
    buf.set(lx - 2, ly + 10, P.brass[0]);
    buf.set(lx + 2, ly + 10, P.brass[0]);
    // moths
    if (frame % 3 === 0) { buf.set(lx + 5, ly + 2, P.bone[2], 0.9); }
    finish(buf, { rimLight: P.amber[3], lightAmount: 0.3, shadowAmount: 0.45, grain: 0.05, seed: 113, skipOutline: false });
}

/* ─── bones / skull ──────────────────────────────────────────────── */
function paintBones(buf) {
    buf.clear();
    // skull
    buf.ellipse(6, 5, 5, 4.2, P.bone[1]);
    buf.ellipse(4.6, 3.8, 2.6, 1.8, P.bone[2]);
    buf.ellipse(4, 5.4, 1.5, 1.6, P.night[0]);
    buf.ellipse(8, 5.4, 1.5, 1.6, P.night[0]);
    buf.rect(4, 8, 5, 2, P.bone[0]);
    buf.set(5, 9, P.night[0]); buf.set(7, 9, P.night[0]);
    // ribs
    for (let i = 0; i < 4; i++) {
        const x = 12 + i * 2.4;
        buf.line(Math.round(x), 8, Math.round(x + 1), 3, P.bone[0]);
        buf.line(Math.round(x), 8, Math.round(x - 1), 4, mix(P.bone[0], INK, 0.4));
    }
    buf.hline(11, 8, 10, P.bone[0]);
    // femur
    buf.line(13, 11, 19, 12, P.bone[0]);
    buf.circle(13, 11, 1.4, P.bone[1], true);
    buf.circle(19, 12, 1.4, P.bone[0], true);
    speckle(buf, 0, 0, 22, 14, P.bone[0], 0.08, 7, 0.6);
    finish(buf, { rimLight: P.bone[2], lightAmount: 0.22, shadowAmount: 0.5, grain: 0.05, seed: 127 });
}

/* ─── bush ───────────────────────────────────────────────────────── */
function paintBush(buf, frame) {
    buf.clear();
    buf.blob(12, 13, 11, 6.4, mix(P.moss[0], P.night[1], 0.3), { seed: 3, jitter: 0.22, lobes: 5 });
    buf.blob(9, 11, 7.5, 4.6, mix(P.moss[1], P.night[1], 0.25), { seed: 5, jitter: 0.24, lobes: 4 });
    buf.blob(7, 9.5, 4, 2.6, P.moss[1], { seed: 8, jitter: 0.2, lobes: 3 });
    speckle(buf, 1, 4, 22, 14, P.moss[2], 0.05, 13, 0.6);
    // a few berries / twigs
    buf.set(16, 10, P.blood[1]); buf.set(18, 13, P.blood[1]); buf.set(6, 14, P.blood[0]);
    buf.line(3, 12, 1, 8, P.wood[1]);
    buf.line(21, 11, 23, 7, P.wood[1]);
    finish(buf, { rimLight: P.moss[2], lightAmount: 0.14, shadowAmount: 0.55, grain: 0.06, seed: 131 });
}

/* ─── stump ──────────────────────────────────────────────────────── */
function paintStump(buf, frame) {
    buf.clear();
    // body
    for (let y = 6; y <= 17; y++) {
        const t = (y - 6) / 11;
        const hw = 9 - t * 0.6;
        for (let x = Math.round(11 - hw); x <= Math.round(11 + hw); x++) {
            let c = P.wood[1];
            if (x <= 11 - hw + 2) { c = P.wood[2]; }
            if (x >= 11 + hw - 2) { c = P.wood[0]; }
            if (x % 4 === 0) { c = mix(c, P.wood[0], 0.4); }
            buf.set(x, y, c);
        }
    }
    // top rings
    buf.ellipse(11, 6, 9, 3.6, P.wood[3]);
    buf.ellipse(11, 6, 7, 2.7, P.wood[2]);
    buf.ellipse(11, 6, 4.6, 1.8, P.wood[3]);
    buf.ellipse(11, 6, 2.4, 1, P.wood[1]);
    buf.set(11, 6, P.wood[0]);
    // mushrooms on the side
    buf.ellipse(4, 12, 2.4, 1.6, P.cyan[2]);
    buf.rect(3, 13, 2, 2, P.bone[1]);
    buf.ellipse(18, 14, 2, 1.3, P.ghost[2]);
    // roots
    buf.hline(2, 17, 18, P.wood[0]);
    finish(buf, { lightAmount: 0.22, shadowAmount: 0.45, grain: 0.06, seed: 137 });
}

/* ─── log ────────────────────────────────────────────────────────── */
function paintLog(buf) {
    buf.clear();
    for (let x = 3; x <= 27; x++) {
        const y = 8 + Math.round(Math.sin((x - 3) / 24 * 1.2) * 1.4);
        for (let j = 0; j < 6; j++) {
            let c = P.wood[1];
            if (j === 0) { c = P.wood[2]; }
            if (j >= 4) { c = P.wood[0]; }
            buf.set(x, y + j, c);
        }
    }
    // cut ends
    buf.ellipse(4, 11, 2.6, 3.4, P.wood[3]);
    buf.ellipse(4, 11, 1.4, 2, P.wood[2]);
    buf.ellipse(27, 11, 2.2, 3, P.wood[0]);
    speckle(buf, 3, 7, 25, 8, P.moss[1], 0.14, 21, 0.8);
    // bark lines
    for (let x = 8; x < 26; x += 5) { buf.vline(x, 9, 4, P.wood[0], 0.5); }
    finish(buf, { lightAmount: 0.2, shadowAmount: 0.5, grain: 0.06, seed: 139 });
}

/* ─── crystal cluster ────────────────────────────────────────────── */
function paintCrystal(buf, frame) {
    buf.clear();
    const glow = frame % 2 ? P.violet[3] : P.violet[2];
    const shards = [[10, 26, 5, 18, P.violet[1]], [5, 26, 3.4, 12, P.violet[0]], [16, 26, 3, 10, P.violet[0]], [12, 26, 2.2, 7, P.violet[1]]];
    for (const [x, yb, w, h, c] of shards) {
        buf.poly([[x - w, yb], [x - w * 0.4, yb - h], [x + w * 0.3, yb - h * 1.06], [x + w, yb]], c);
        buf.poly([[x - w * 0.4, yb - h], [x + w * 0.3, yb - h * 1.06], [x + w * 0.1, yb]], mix(c, P.violet[3], 0.45));
        buf.line(x - w * 0.4, yb - h, x - w * 0.1, yb, glow, 0.8);
        buf.set(Math.round(x - w * 0.4), Math.round(yb - h), P.violet[4]);
    }
    // base rock
    buf.blob(10, 26, 9, 3, P.stone[1], { seed: 41, jitter: 0.2, lobes: 3 });
    speckle(buf, 1, 22, 18, 6, P.stone[2], 0.2, 9, 0.7);
    finish(buf, { rimLight: P.violet[4], lightAmount: 0.3, shadowAmount: 0.35, grain: 0.04, seed: 149 });
}

/* ─── ruined pillar with runes ───────────────────────────────────── */
function paintPillar(buf, frame) {
    buf.clear();
    // base
    buf.ellipse(11, 46, 10, 3, P.stone[1]);
    buf.rect(3, 40, 17, 6, P.stone[1]);
    buf.rect(3, 40, 17, 2, P.stone[2]);
    speckle(buf, 3, 40, 17, 6, P.stone[0], 0.16, 31, 0.7);
    // shaft
    for (let y = 6; y <= 40; y++) {
        for (let x = 5; x <= 17; x++) {
            let c = P.stone[1];
            if (x <= 6) { c = P.stone[2]; }
            if (x >= 16) { c = P.stone[0]; }
            if (x === 9 || x === 13) { c = mix(c, P.stone[0], 0.28); }
            buf.set(x, y, c);
        }
    }
    // broken top
    buf.poly([[4, 8], [8, 3], [13, 6], [18, 2], [19, 9], [4, 9]], P.stone[2]);
    buf.poly([[4, 9], [19, 9], [19, 11], [4, 11]], P.stone[1]);
    // glowing runes
    const on = frame % 2 === 0;
    const rc = on ? P.violet[3] : P.violet[2];
    const runes = [[8, 16], [12, 20], [9, 26], [13, 31], [8, 35]];
    runes.forEach(([x, y], i) => {
        if (on || i % 2 === 0) {
            buf.vline(x, y, 3, rc, 0.95);
            buf.set(x + 1, y + 1, rc, 0.7);
            buf.set(x - 1, y + 2, rc, 0.5);
        }
    });
    speckle(buf, 5, 6, 13, 34, P.stone[2], 0.07, 17, 0.6);
    speckle(buf, 5, 30, 13, 10, P.moss[1], 0.14, 23, 0.8);
    finish(buf, { rimLight: P.violet[3], lightAmount: 0.22, shadowAmount: 0.5, grain: 0.06, seed: 151 });
}

/* ─── candles ────────────────────────────────────────────────────── */
function paintCandles(buf, frame) {
    buf.clear();
    const candles = [[4, 15, 6], [9, 15, 9], [13, 15, 5]];
    candles.forEach(([x, yb, h], i) => {
        buf.rect(x - 1, yb - h, 3, h, P.bone[1]);
        buf.vline(x - 1, yb - h, h, P.bone[2]);
        buf.vline(x + 1, yb - h, h, P.bone[0]);
        // wax drip
        buf.set(x - 2, yb - h + 2, P.bone[1]);
        const fy = yb - h - 2 - (frame + i) % 2;
        buf.ellipse(x, fy, 1.5, 2.2, P.amber[2]);
        buf.ellipse(x, fy, 0.9, 1.4, P.amber[4]);
        buf.set(x, fy - 1, P.amber[5]);
    });
    // holder
    buf.ellipse(9, 15, 9, 2, P.brass[1]);
    speckle(buf, 0, 13, 18, 4, P.brass[2], 0.2, 5, 0.6);
    finish(buf, { rimLight: P.amber[4], lightAmount: 0.35, shadowAmount: 0.35, grain: 0.03, seed: 157 });
}

/* ─── grass tuft / flower ────────────────────────────────────────── */
function paintGrass(buf, frame) {
    buf.clear();
    const sway = frame % 2 ? 1 : 0;
    for (let i = 0; i < 7; i++) {
        const x = 1 + i * 1.4;
        const h = 4 + Math.round(hash2(i, 3, 7) * 4);
        buf.line(Math.round(x), 9, Math.round(x + sway + (i - 3) * 0.3), 9 - h, i % 2 ? P.moss[2] : P.moss[1]);
        buf.set(Math.round(x + sway + (i - 3) * 0.3), 9 - h, P.moss[3], 0.8);
    }
    buf.hline(0, 9, 11, P.moss[0], 0.7);
}

function paintFlower(buf, frame) {
    buf.clear();
    buf.vline(5, 4, 6, P.moss[2]);
    buf.set(3, 7, P.moss[2]); buf.set(7, 6, P.moss[1]);
    const c = frame % 2 ? P.cyan[3] : P.cyan[2];
    for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * 6.283;
        buf.set(Math.round(5 + Math.cos(ang) * 2.4), Math.round(4 + Math.sin(ang) * 2.4), c);
    }
    buf.set(5, 4, P.amber[4]);
    buf.set(5, 3, P.cyan[4], 0.7);
}

/* ─── broken fence ───────────────────────────────────────────────── */
function paintFence(buf) {
    buf.clear();
    for (const x of [3, 14, 25]) {
        const h = x === 14 ? 12 : 16;
        buf.rect(x, 18 - h, 3, h, P.wood[1]);
        buf.vline(x, 18 - h, h, P.wood[2]);
        buf.vline(x + 2, 18 - h, h, P.wood[0]);
        buf.poly([[x, 18 - h], [x + 1, 16 - h], [x + 3, 18 - h]], P.wood[2]);
    }
    buf.line(2, 9, 16, 11, P.wood[1]);
    buf.line(16, 11, 27, 8, P.wood[0]);
    buf.line(2, 14, 16, 16, P.wood[1]);
    buf.line(16, 16, 27, 13, P.wood[0]);
    speckle(buf, 0, 4, 30, 16, P.moss[1], 0.1, 9, 0.7);
    finish(buf, { lightAmount: 0.2, shadowAmount: 0.5, grain: 0.06, seed: 163 });
}

/* ─── puddle ─────────────────────────────────────────────────────── */
function paintPuddle(buf, frame) {
    buf.clear();
    // irregular rounded outline first
    const pts = [];
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * 6.283;
        const r = 1 + Math.sin(a * 3 + 1.2) * 0.12 + Math.sin(a * 5) * 0.06;
        pts.push([13 + Math.cos(a) * 11.4 * r, 7 + Math.sin(a) * 5.2 * r]);
    }
    buf.poly(pts, P.dirt[0]);
    buf.ellipse(13, 7, 10.2, 4.4, 0x0a1020);
    buf.ellipse(13, 7, 8.4, 3.4, 0x0e1830);
    // faint moonlight sheen, very low alpha so it reads as water, not a slab
    const sh = frame % 2;
    buf.hline(7 + sh, 5, 5, P.cyan[1], 0.22);
    buf.hline(11 - sh, 8, 6, P.violet[1], 0.16);
    buf.set(16, 5, P.cyan[2], 0.2);
    // wet dark rim
    for (let i = 0; i < 40; i++) {
        const a = (i / 40) * 6.283;
        buf.set(Math.round(13 + Math.cos(a) * 11), Math.round(7 + Math.sin(a) * 5), P.dirt[0], 0.6);
    }
}

/* ─── registry ───────────────────────────────────────────────────── */

export const PROP_SPRITES = [
    { key: 'tree_dead', w: 36, h: 64, frames: ['tree_dead_0', 'tree_dead_1'], paint: paintTreeDead },
    { key: 'pine', w: 32, h: 56, frames: ['pine_0'], paint: paintPine },
    { key: 'rock_big', w: 30, h: 22, frames: ['rock_big_0'], paint: paintRock(30, 22, 5) },
    { key: 'rock_small', w: 16, h: 12, frames: ['rock_small_0'], paint: paintRock(16, 12, 17) },
    { key: 'pebble', w: 9, h: 7, frames: ['pebble_0'], paint: paintRock(9, 7, 29) },
    { key: 'mushrooms', w: 18, h: 17, frames: ['mushrooms_0', 'mushrooms_1'], paint: paintMushrooms },
    { key: 'grave', w: 22, h: 28, frames: ['grave_0', 'grave_1'], paint: paintGrave },
    { key: 'lantern_post', w: 18, h: 45, frames: ['lantern_post_0', 'lantern_post_1', 'lantern_post_2', 'lantern_post_3'], paint: paintLanternPost },
    { key: 'bones', w: 22, h: 14, frames: ['bones_0'], paint: paintBones },
    { key: 'bush', w: 24, h: 18, frames: ['bush_0'], paint: paintBush },
    { key: 'stump', w: 22, h: 18, frames: ['stump_0'], paint: paintStump },
    { key: 'log', w: 30, h: 16, frames: ['log_0'], paint: paintLog },
    { key: 'crystal', w: 20, h: 28, frames: ['crystal_0', 'crystal_1'], paint: paintCrystal },
    { key: 'pillar', w: 22, h: 48, frames: ['pillar_0', 'pillar_1'], paint: paintPillar },
    { key: 'candles', w: 18, h: 17, frames: ['candles_0', 'candles_1', 'candles_2'], paint: paintCandles },
    { key: 'grass', w: 12, h: 10, frames: ['grass_0', 'grass_1'], paint: paintGrass },
    { key: 'flower', w: 11, h: 11, frames: ['flower_0', 'flower_1'], paint: paintFlower },
    { key: 'fence', w: 30, h: 19, frames: ['fence_0'], paint: paintFence },
    { key: 'puddle', w: 26, h: 14, frames: ['puddle_0', 'puddle_1'], paint: paintPuddle }
];

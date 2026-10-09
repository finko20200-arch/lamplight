import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle, softDot } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   PICKUPS & LOOT
   ══════════════════════════════════════════════════════════════════════ */

function emberShard(buf, size, frame, colors) {
    buf.clear();
    const c = size / 2 - 0.5;
    const pulse = frame % 2;
    // crystal diamond
    const pts = [[c, 1], [size - 2, c], [c, size - 2], [1, c]];
    buf.poly(pts, colors[0]);
    buf.poly([[c, 1], [size - 2, c], [c, c + 1]], colors[1]);
    buf.poly([[c, 1], [1, c], [c, c + 1]], colors[2]);
    buf.set(Math.round(c), Math.round(c) - 1, pulse ? colors[3] : colors[2]);
    // inner spark
    buf.set(Math.round(c) - 1, Math.round(c), colors[3], 0.9);
    // orbiting motes
    if (pulse) {
        buf.set(Math.round(c) + 2, Math.round(c) - 2, colors[3], 0.6);
        buf.set(Math.round(c) - 2, Math.round(c) + 2, colors[2], 0.5);
    }
    finish(buf, { rimLight: colors[3], rimShadow: null, lightAmount: 0.4, shadowAmount: 0, grain: 0, seed: 3 });
}

function paintFlask(buf, frame) {
    buf.clear();
    const pulse = frame % 2;
    // cork + neck
    buf.rect(5, 1, 4, 2, P.wood[2]);
    buf.rect(6, 3, 2, 3, P.bone[1], 0.85);
    // body
    buf.ellipse(7, 10, 5.4, 5, 0x2a0d16);
    buf.ellipse(7, 10, 4.4, 4.2, P.blood[1]);
    buf.ellipse(7, 11, 3.6, 3.2, P.blood[2]);
    buf.ellipse(6, 9, 1.8, 1.6, pulse ? P.blood[4] : P.blood[3]);
    // glass highlight
    buf.line(3, 8, 4, 12, P.bone[3], 0.55);
    buf.set(10, 7, P.bone[3], 0.4);
    // bubbles
    buf.set(8, 12, P.blood[4], 0.8);
    if (pulse) { buf.set(6, 7, P.blood[4], 0.9); }
    // rim
    buf.ellipse(7, 6, 3, 1.2, P.stone[2]);
    finish(buf, { rimLight: P.blood[3], lightAmount: 0.35, shadowAmount: 0.3, grain: 0.03, seed: 9 });
}

function paintMagnet(buf, frame) {
    buf.clear();
    const pulse = frame % 2;
    // horseshoe, 2px thick band
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) {
        const x = Math.round(8 + Math.cos(a) * 5);
        const y = Math.round(9 + Math.sin(a) * 5);
        buf.rect(x - 1, y, 2, 2, P.stone[3]);
    }
    buf.rect(2, 8, 3, 6, P.blood[2]);
    buf.rect(11, 8, 3, 6, P.blood[2]);
    buf.rect(2, 12, 3, 2, P.stone[3]);
    buf.rect(11, 12, 3, 2, P.stone[3]);
    buf.set(2, 9, P.blood[3]); buf.set(11, 9, P.blood[3]);
    // field arcs
    const fc = pulse ? P.cyan[3] : P.cyan[2];
    for (let i = 0; i < 3; i++) {
        buf.hline(8 - 3 - i * 2, 3 - i, 7 + i * 4, fc, 0.8 - i * 0.22);
    }
    finish(buf, { rimLight: P.cyan[3], lightAmount: 0.35, shadowAmount: 0.35, grain: 0.03, seed: 15 });
}

function paintBomb(buf, frame) {
    buf.clear();
    const pulse = frame % 2;
    buf.circle(7, 10, 5.6, 0x1b1626, true);
    buf.circle(6, 9, 4, 0x2b2440, true);
    buf.circle(5, 8, 2, 0x3d3557, true);
    buf.set(5, 7, 0x574d75);
    // cap
    buf.rect(5, 3, 4, 2, P.stone[2]);
    buf.rect(5, 3, 4, 1, P.stone[3]);
    // fuse
    buf.line(8, 3, 11, 0, P.wood[2]);
    buf.set(11, 0, pulse ? P.amber[5] : P.amber[3]);
    if (pulse) {
        buf.set(12, 1, P.amber[3], 0.7);
        buf.set(10, 0, P.amber[2], 0.6);
        buf.set(11, -1 + 1, P.amber[4], 0.5);
    }
    // rune on the shell
    buf.set(7, 11, P.violet[2], 0.9);
    buf.set(8, 12, P.violet[2], 0.7);
    finish(buf, { rimLight: P.amber[3], lightAmount: 0.25, shadowAmount: 0.4, grain: 0.05, seed: 21 });
}

function paintChest(buf, frame) {
    buf.clear();
    const open = frame >= 1;
    // body
    buf.rect(2, 8, 20, 10, P.wood[1]);
    buf.rect(2, 8, 20, 2, P.wood[2]);
    buf.rect(2, 16, 20, 2, P.wood[0]);
    for (let x = 3; x < 22; x += 4) { buf.vline(x, 8, 10, P.wood[0], 0.4); }
    // metal bands
    buf.rect(5, 8, 2, 10, P.brass[1]);
    buf.rect(17, 8, 2, 10, P.brass[1]);
    buf.vline(5, 8, 10, P.brass[2]); buf.vline(17, 8, 10, P.brass[2]);
    // lid
    if (!open) {
        for (let y = 2; y <= 8; y++) {
            const t = (y - 2) / 6;
            const hw = 10 - Math.pow(1 - t, 2) * 1.2;
            for (let x = Math.round(12 - hw); x <= Math.round(12 + hw); x++) {
                buf.set(x, y, y < 4 ? P.wood[2] : P.wood[1]);
            }
        }
        buf.rect(5, 3, 2, 6, P.brass[1]);
        buf.rect(17, 3, 2, 6, P.brass[1]);
        buf.rect(10, 6, 4, 5, P.brass[2]);
        buf.rect(11, 8, 2, 2, P.gold[3]);
    } else {
        // lid thrown back
        for (let y = 0; y <= 5; y++) {
            for (let x = 2; x <= 22; x++) {
                if (y < 2 && (x < 4 || x > 20)) { continue; }
                buf.set(x, y, y < 2 ? P.wood[2] : P.wood[1]);
            }
        }
        buf.rect(5, 0, 2, 5, P.brass[1]);
        buf.rect(17, 0, 2, 5, P.brass[1]);
        // glowing contents
        const g = frame === 2 ? P.gold[3] : P.gold[2];
        buf.rect(3, 6, 18, 3, g);
        buf.rect(5, 5, 14, 2, P.gold[4]);
        for (let i = 0; i < 6; i++) {
            const x = 4 + i * 3;
            buf.set(x, 4 - (i % 2), P.gold[4]);
            buf.set(x + 1, 3, P.amber[4], 0.8);
        }
        // light rays
        for (let i = 0; i < 5; i++) {
            const x = 5 + i * 3.5;
            buf.line(Math.round(x), 5, Math.round(x + (i - 2) * 0.8), 0, P.gold[3], 0.45);
        }
    }
    speckle(buf, 2, 8, 20, 10, P.wood[0], 0.08, 11, 0.6);
    finish(buf, { rimLight: P.gold[2], lightAmount: 0.28, shadowAmount: 0.4, grain: 0.05, seed: 33 });
}

function paintCoin(buf, frame) {
    buf.clear();
    const widths = [4.4, 3, 1.4, 3];
    const w = widths[frame % 4];
    buf.ellipse(5, 5, w, 4.4, P.gold[1]);
    buf.ellipse(5, 5, w * 0.78, 3.4, P.gold[2]);
    if (w > 2) {
        buf.ellipse(4.4, 4, w * 0.3, 1.4, P.gold[3]);
        buf.set(Math.round(5), Math.round(5), P.gold[0]);
        // emblem
        buf.vline(Math.round(5), 3, 4, P.gold[0], 0.7);
    } else {
        buf.vline(Math.round(5), 2, 6, P.gold[3]);
    }
    finish(buf, { rimLight: P.gold[4], lightAmount: 0.4, shadowAmount: 0.3, grain: 0, seed: 41 });
}

export const ITEM_SPRITES = [
    { key: 'ember_s', w: 8, h: 8, frames: ['ember_s_0', 'ember_s_1'], paint: (b, f) => emberShard(b, 8, f, [P.amber[1], P.amber[2], P.amber[3], P.amber[5]]) },
    { key: 'ember_m', w: 12, h: 12, frames: ['ember_m_0', 'ember_m_1'], paint: (b, f) => emberShard(b, 12, f, [P.amber[1], P.amber[2], P.amber[4], P.amber[5]]) },
    { key: 'ember_l', w: 16, h: 16, frames: ['ember_l_0', 'ember_l_1'], paint: (b, f) => emberShard(b, 16, f, [P.cyan[1], P.cyan[2], P.cyan[3], P.cyan[4]]) },
    { key: 'flask', w: 14, h: 16, frames: ['flask_0', 'flask_1'], paint: paintFlask },
    { key: 'magnet', w: 16, h: 16, frames: ['magnet_0', 'magnet_1'], paint: paintMagnet },
    { key: 'bomb', w: 14, h: 16, frames: ['bomb_0', 'bomb_1'], paint: paintBomb },
    { key: 'chest', w: 24, h: 20, frames: ['chest_0', 'chest_1', 'chest_2'], paint: paintChest },
    { key: 'coin', w: 10, h: 10, frames: ['coin_0', 'coin_1', 'coin_2', 'coin_3'], paint: paintCoin }
];

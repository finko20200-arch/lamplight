import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle, softDot, ringSprite } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   PROJECTILES
   All are drawn pointing RIGHT (+x). Rotation is applied at runtime.
   ══════════════════════════════════════════════════════════════════════ */

function paintSpark(buf, frame) {
    buf.clear();
    const pulse = frame % 3;
    // hot core
    buf.circle(5, 5, 2.2, P.amber[5], true);
    buf.circle(5, 5, 3.2, P.amber[3], true);
    buf.circle(5, 5, 4.2, P.amber[1], true);
    // teardrop tail
    buf.poly([[5, 3], [0, 5], [5, 7]], P.amber[2]);
    buf.poly([[4, 4], [1, 5], [4, 6]], P.amber[3]);
    // crackle
    const a = pulse * 2.1;
    buf.set(Math.round(5 + Math.cos(a) * 4), Math.round(5 + Math.sin(a) * 4), P.amber[4], 0.9);
    buf.set(Math.round(5 + Math.cos(a + 2) * 3.4), Math.round(5 + Math.sin(a + 2) * 3.4), P.amber[3], 0.7);
}

function paintBlade(buf, frame) {
    buf.clear();
    const f = frame % 2;
    const cx = 1.5, cy = 5;
    const dir = f ? -1 : 1;
    // crescent band: outer radius bright, inner darker
    for (let a = -1.25; a <= 1.25; a += 0.05) {
        for (let r = 4.4; r <= 8.4; r += 0.5) {
            const x = Math.round(cx + Math.cos(a) * r);
            const y = Math.round(cy + Math.sin(a) * r * dir);
            const t = (r - 4.4) / 4;
            const c = t > 0.74 ? P.stone[4] : t > 0.42 ? P.stone[3] : P.stone[1];
            buf.set(x, y, c);
        }
    }
    // sharpened outer edge
    for (let a = -1.25; a <= 1.25; a += 0.05) {
        buf.set(Math.round(cx + Math.cos(a) * 8.4), Math.round(cy + Math.sin(a) * 8.4 * dir), P.bone[3], 0.95);
    }
    // golden tips
    for (const s of [-1, 1]) {
        const a = 1.25 * s;
        buf.set(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 8 * dir), P.gold[3]);
        buf.set(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7 * dir), P.gold[2]);
    }
    // hilt
    buf.rect(0, 4, 2, 3, P.gold[1]);
    buf.set(0, 5, P.gold[3]);
    // motion streak
    buf.hline(1, f ? 1 : 9, 6, P.cyan[2], 0.35);
}

function paintLance(buf, frame) {
    buf.clear();
    const pulse = frame % 2;
    // shaft
    for (let x = 2; x <= 24; x++) {
        const t = (x - 2) / 22;
        const h = 0.7 + Math.sin(t * 3.14) * 1.7;
        for (let y = Math.round(4 - h); y <= Math.round(4 + h); y++) {
            let c = P.cyan[2];
            if (y < 4) { c = P.cyan[3]; }
            if (y > 4 + h - 0.5) { c = P.cyan[1]; }
            buf.set(x, y, c);
        }
    }
    // head
    buf.poly([[24, 4], [28, 4], [26, 1], [25, 4]], P.cyan[3]);
    buf.poly([[24, 4], [28, 4], [26, 7]], P.cyan[2]);
    buf.line(24, 4, 27, 4, P.cyan[4]);
    // frost barbs
    buf.line(20, 4, 18, 1, P.cyan[3]);
    buf.line(20, 4, 18, 7, P.cyan[1]);
    buf.line(14, 4, 12, 2, P.cyan[3], 0.8);
    buf.line(14, 4, 12, 6, P.cyan[1], 0.8);
    // core glow
    buf.hline(6, 4, 14, pulse ? P.cyan[4] : P.cyan[3]);
    // trailing frost motes
    buf.set(1, 3, P.cyan[3], 0.6);
    buf.set(0, 5, P.cyan[2], 0.4);
    buf.set(2, 6, P.cyan[3], 0.5);
}

function paintOrb(buf, frame) {
    buf.clear();
    const c = 6, pulse = frame % 3;
    buf.circle(c, c, 5, P.violet[0], true);
    buf.circle(c, c, 4, P.violet[1], true);
    buf.circle(c - 0.6, c - 0.6, 2.6, P.violet[2], true);
    buf.circle(c - 1, c - 1, 1.4, P.violet[4], true);
    // swirl
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + pulse * 1.2;
        buf.set(Math.round(c + Math.cos(a) * 4.2), Math.round(c + Math.sin(a) * 4.2), P.violet[3], 0.75);
    }
    // arc spikes
    for (let i = 0; i < 3; i++) {
        const a = (pulse / 3) * 6.283 + i * 2.1;
        buf.line(Math.round(c + Math.cos(a) * 4), Math.round(c + Math.sin(a) * 4),
            Math.round(c + Math.cos(a) * 6), Math.round(c + Math.sin(a) * 6), P.violet[3], 0.6);
    }
}

function paintRuneSigil(buf, frame) {
    buf.clear();
    const c = 22, t = frame / 4;
    // outer ring
    for (let i = 0; i < 180; i++) {
        const a = (i / 180) * 6.283;
        const r = 20 + Math.sin(a * 6 + t * 12) * 0.6;
        buf.set(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r * 0.62), P.violet[2], 0.9);
        buf.set(Math.round(c + Math.cos(a) * (r - 1)), Math.round(c + Math.sin(a) * (r - 1) * 0.62), P.violet[1], 0.5);
    }
    // inner ring
    for (let i = 0; i < 120; i++) {
        const a = (i / 120) * 6.283;
        buf.set(Math.round(c + Math.cos(a) * 13), Math.round(c + Math.sin(a) * 13 * 0.62), P.violet[3], 0.75);
    }
    // rotating glyphs
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283 + t * 6.283;
        const x = Math.round(c + Math.cos(a) * 16.5);
        const y = Math.round(c + Math.sin(a) * 16.5 * 0.62);
        buf.set(x, y, P.violet[4]);
        buf.set(x, y - 1, P.violet[3]);
        buf.set(x + 1, y, P.violet[3], 0.8);
    }
    // centre sigil
    buf.line(c - 5, c, c + 5, c, P.violet[3], 0.8);
    buf.line(c, c - 3, c, c + 3, P.violet[3], 0.8);
    buf.circle(c, c, 3.4, P.violet[2], false);
    buf.set(c, c, frame % 2 ? P.violet[4] : P.violet[3]);
    // fill glow
    for (let y = 0; y < 44; y++) {
        for (let x = 0; x < 44; x++) {
            const d = Math.hypot((x - c) / 20, (y - c) / 12.4);
            if (d < 1) { buf.set(x, y, P.violet[1], (1 - d) * 0.16); }
        }
    }
}

function paintFlaskProj(buf, frame) {
    buf.clear();
    const rot = frame % 2;
    // simple tumbling flask
    buf.ellipse(6, 7 + rot, 4.4, 4, P.blood[1]);
    buf.ellipse(6, 8 + rot, 3.2, 2.8, P.blood[2]);
    buf.rect(5, 1 + rot, 3, 3, P.bone[1], 0.8);
    buf.rect(4, 0 + rot, 5, 2, P.wood[2]);
    buf.set(4, 6 + rot, P.blood[4], 0.9);
    // trail
    buf.set(1, 4 + rot, P.blood[2], 0.5);
    buf.set(0, 8 - rot, P.blood[1], 0.4);
    finish(buf, { rimLight: P.blood[3], lightAmount: 0.3, shadowAmount: 0.3, grain: 0, seed: 5 });
}

function paintFirePatch(buf, frame) {
    buf.clear();
    const f = frame % 4;
    // scorch base
    buf.ellipse(16, 13, 15, 6, 0x1a0d10, 0.85);
    buf.ellipse(16, 13, 12, 4.6, 0x2a1114, 0.8);
    // flames
    for (let i = 0; i < 9; i++) {
        const x = 4 + i * 3 + ((hash2(i, f, 3) - 0.5) * 2 | 0);
        const h = 4 + Math.round(hash2(i, f + 7, 11) * 6);
        for (let y = 0; y < h; y++) {
            const t = y / h;
            const c = t < 0.3 ? P.amber[4] : t < 0.55 ? P.amber[2] : t < 0.8 ? P.ember[2] : P.ember[1];
            buf.set(x, 14 - y, c, 1 - t * 0.55);
            if (t < 0.6) { buf.set(x + (i % 2 ? 1 : -1), 14 - y, c, 0.5); }
        }
    }
    // embers rising
    for (let i = 0; i < 5; i++) {
        const x = 5 + ((i * 7 + f * 3) % 22);
        const y = 2 + ((i * 5 + f * 2) % 6);
        buf.set(x, y, P.amber[4], 0.7);
    }
}

function paintSpit(buf, frame) {
    buf.clear();
    const pulse = frame % 2;
    buf.circle(5, 5, 3.6, P.violet[1], true);
    buf.circle(5, 5, 2.6, P.violet[2], true);
    buf.circle(4.4, 4.4, 1.2, pulse ? P.violet[4] : P.violet[3], true);
    // drips
    buf.set(1, 5, P.violet[2], 0.7);
    buf.set(0, 6, P.violet[1], 0.5);
    buf.set(8, 7, P.violet[2], 0.6);
    buf.set(9, 4, P.violet[1], 0.4);
}

function paintBossOrb(buf, frame) {
    buf.clear();
    const c = 11, pulse = frame % 3;
    buf.circle(c, c, 9.4, P.violet[0], true);
    buf.circle(c, c, 8, P.violet[1], true);
    buf.blob(c, c, 6, 6, P.violet[2], { seed: 3 + pulse, jitter: 0.24, lobes: 4 });
    buf.blob(c - 1, c - 1, 3.6, 3.6, P.violet[3], { seed: 9, jitter: 0.2, lobes: 3 });
    buf.circle(c - 1.6, c - 1.6, 1.8, P.violet[4], true);
    // lightning arcs
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.283 + pulse * 0.7;
        const r0 = 8, r1 = 10.4;
        buf.line(Math.round(c + Math.cos(a) * r0), Math.round(c + Math.sin(a) * r0),
            Math.round(c + Math.cos(a + 0.3) * r1), Math.round(c + Math.sin(a + 0.3) * r1), P.violet[4], 0.85);
    }
    // inner eye
    buf.ellipse(c, c + 1, 2.4, 1.2, P.night[0], true, 0.5);
}

function paintShard(buf, frame) {
    buf.clear();
    buf.poly([[0, 4], [4, 1], [8, 4], [4, 7]], P.shade[2]);
    buf.poly([[0, 4], [4, 1], [4, 4]], P.shade[3]);
    buf.poly([[4, 4], [8, 4], [4, 7]], P.shade[1]);
    buf.set(4, 4, frame % 2 ? P.blood[3] : P.blood[2]);
}

export const PROJECTILE_SPRITES = [
    { key: 'spark', w: 10, h: 10, frames: ['spark_0', 'spark_1', 'spark_2'], paint: paintSpark },
    { key: 'blade', w: 19, h: 10, frames: ['blade_0', 'blade_1'], paint: paintBlade },
    { key: 'lance', w: 29, h: 9, frames: ['lance_0', 'lance_1'], paint: paintLance },
    { key: 'orb', w: 12, h: 12, frames: ['orb_0', 'orb_1', 'orb_2'], paint: paintOrb },
    { key: 'rune_sigil', w: 44, h: 44, frames: ['rune_sigil_0', 'rune_sigil_1', 'rune_sigil_2', 'rune_sigil_3'], paint: paintRuneSigil },
    { key: 'flask_proj', w: 12, h: 14, frames: ['flask_proj_0', 'flask_proj_1'], paint: paintFlaskProj },
    { key: 'fire_patch', w: 32, h: 20, frames: ['fire_patch_0', 'fire_patch_1', 'fire_patch_2', 'fire_patch_3'], paint: paintFirePatch },
    { key: 'spit', w: 10, h: 10, frames: ['spit_0', 'spit_1'], paint: paintSpit },
    { key: 'boss_orb', w: 22, h: 22, frames: ['boss_orb_0', 'boss_orb_1', 'boss_orb_2'], paint: paintBossOrb },
    { key: 'shard', w: 9, h: 8, frames: ['shard_0', 'shard_1'], paint: paintShard }
];

import { PixelBuffer, hash2 } from '../PixelBuffer.js';
import { P, INK, mix } from '../palette.js';
import { finish, speckle, softDot, ringSprite, puff, shadowSprite } from '../artUtils.js';

/* ══════════════════════════════════════════════════════════════════════
   EFFECTS — impacts, explosions, decals, rings, ambient motes.
   Anything additive is drawn WITHOUT an outline so it blends into the glow.
   ══════════════════════════════════════════════════════════════════════ */

/* ─── impact spark ───────────────────────────────────────────────── */
function paintHitSpark(buf, frame) {
    buf.clear();
    const c = 8;
    const r = [3, 5.5, 7, 7.8][frame];
    const alpha = [1, 0.95, 0.8, 0.55][frame];
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + frame * 0.22;
        const len = r * (0.75 + hash2(i, frame, 5) * 0.5);
        for (let t = 0; t < len; t++) {
            const x = Math.round(c + Math.cos(a) * t);
            const y = Math.round(c + Math.sin(a) * t);
            const k = Math.max(0.55, 1 - t / len);
            buf.set(x, y, t < len * 0.4 ? 0xffffff : P.amber[4], k * alpha);
            buf.set(x + (Math.abs(Math.cos(a)) > 0.7 ? 0 : 1), y + (Math.abs(Math.sin(a)) > 0.7 ? 0 : 1),
                P.amber[3], k * alpha * 0.55);
        }
    }
    buf.circle(c, c, Math.max(1, r * 0.42), P.amber[5], true);
    buf.circle(c, c, Math.max(0.6, r * 0.22), 0xffffff, true);
}

/* ─── melee slash arc ────────────────────────────────────────────── */
function paintSlash(buf, frame) {
    buf.clear();
    const c = 16;
    const prog = [0.15, 0.45, 0.75, 1][frame];
    const a0 = -1.9 + prog * 1.5;
    const a1 = a0 + 1.7 + prog * 0.9;
    for (let a = a0; a <= a1; a += 0.03) {
        for (let r = 6; r <= 14.5; r += 1) {
            const t = (r - 6) / 8.5;
            const x = Math.round(c + Math.cos(a) * r);
            const y = Math.round(c + Math.sin(a) * r);
            const fade = (1 - Math.abs(t - 0.45) * 1.2) * (1 - (a - a0) / (a1 - a0) * 0.5);
            if (fade <= 0) { continue; }
            buf.set(x, y, t < 0.35 ? P.bone[3] : t < 0.7 ? P.amber[4] : P.amber[2], Math.min(1, fade));
        }
    }
    // leading edge spark
    const ex = Math.round(c + Math.cos(a1) * 12), ey = Math.round(c + Math.sin(a1) * 12);
    buf.circle(ex, ey, 2, P.amber[5], true);
    buf.set(ex + 1, ey - 1, P.bone[3]);
}

/* ─── explosion ──────────────────────────────────────────────────── */
function paintExplosion(buf, frame) {
    buf.clear();
    const c = 26;
    const t = frame / 5;
    const R = 6 + t * 19;
    if (frame < 3) {
        // fireball
        buf.blob(c, c, R, R, P.ember[1], { seed: 2, jitter: 0.22, lobes: 5 });
        buf.blob(c, c, R * 0.78, R * 0.78, P.amber[2], { seed: 5, jitter: 0.2, lobes: 4 });
        buf.blob(c - R * 0.1, c - R * 0.12, R * 0.5, R * 0.5, P.amber[4], { seed: 8, jitter: 0.18, lobes: 3 });
        if (frame === 0) { buf.circle(c, c, R * 0.32, P.amber[5], true); }
        // shock ring
        for (let i = 0; i < 140; i++) {
            const a = (i / 140) * 6.283;
            const rr = R * (1.15 + t * 0.2);
            buf.set(Math.round(c + Math.cos(a) * rr), Math.round(c + Math.sin(a) * rr), P.amber[3], 0.5 * (1 - t * 2));
        }
    } else {
        // smoke column
        const k = (frame - 2) / 3;
        buf.blob(c, c - k * 4, R * (0.8 + k * 0.3), R * (0.7 + k * 0.2), mix(0x4a4266, 0x645c82, k), { seed: 12, jitter: 0.26, lobes: 5 });
        buf.blob(c - 4, c - 5 - k * 4, R * 0.4, R * 0.36, mix(0x6a6190, 0x847ca6, k), { seed: 17, jitter: 0.24, lobes: 4 });
        for (let y = 0; y < buf.height; y++) {
            for (let x = 0; x < buf.width; x++) {
                const d = Math.hypot(x - c, y - (c - k * 4)) / (R * 1.15);
                if (buf.alphaAt(x, y) > 0) { buf.mulAlpha(x, y, Math.max(0, Math.min(1, (1 - d) * 2.2)) * (1 - k * 0.35)); }
            }
        }
        // embers inside
        for (let i = 0; i < 10; i++) {
            const a = hash2(i, frame, 3) * 6.283;
            const rr = hash2(i, frame, 9) * R * 0.7;
            buf.set(Math.round(c + Math.cos(a) * rr), Math.round(c + Math.sin(a) * rr - k * 4), P.ember[2], (1 - k) * 0.8);
        }
    }
    // flying debris
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + 0.4;
        const rr = R * (1.1 + t * 0.9);
        const x = Math.round(c + Math.cos(a) * rr), y = Math.round(c + Math.sin(a) * rr);
        buf.set(x, y, i % 2 ? P.ember[2] : P.amber[3], Math.max(0, 1 - t * 1.3));
        buf.set(x + 1, y, P.amber[1], Math.max(0, 0.6 - t));
    }
}

/* ─── smoke puff ─────────────────────────────────────────────────── */
function paintSmoke(buf, frame) {
    buf.clear();
    const c = 10, t = frame / 3;
    const r = 4.5 + t * 5.5;
    const col = mix(0x453d5e, 0x645c82, t);
    buf.blob(c, c - t * 2, r, r * 0.9, col, { seed: 4 + frame, jitter: 0.24, lobes: 4 });
    buf.blob(c - r * 0.2, c - t * 2 - r * 0.2, r * 0.55, r * 0.5, mix(col, 0x847ca6, 0.7), { seed: 11, jitter: 0.2, lobes: 3 });
    // fade edges
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
            const d = Math.hypot(x - c, y - (c - t * 2)) / (r + 1.4);
            if (buf.alphaAt(x, y) > 0) {
                const edge = Math.max(0, Math.min(1, (1 - d) * 1.9));
                buf.mulAlpha(x, y, edge * (1 - t * 0.25));
            }
        }
    }
}

/* ─── rising soul ────────────────────────────────────────────────── */
function paintSoul(buf, frame) {
    buf.clear();
    const c = 7, t = frame / 3;
    const y = 11 - t * 4;
    buf.blob(c, y, 5 - t * 1.2, 6.2 - t * 1.6, P.cyan[2], { seed: 6, jitter: 0.18, lobes: 3 });
    buf.blob(c, y - 0.6, 3 - t * 0.8, 3.8 - t, P.cyan[3], { seed: 9, jitter: 0.14, lobes: 2 });
    buf.circle(c, y - 0.8, 1.6 - t * 0.5, P.cyan[4], true);
    // tail
    buf.line(c, Math.round(y + 5 - t), c + Math.round(Math.sin(t * 8) * 2), 15, P.cyan[2], 0.6 * (1 - t));
    // eyes
    if (frame < 2) {
        buf.set(c - 1, Math.round(y - 1), P.night[0], 0.9);
        buf.set(c + 1, Math.round(y - 1), P.night[0], 0.9);
    }
}

/* ─── level-up ring (golden, runic) ──────────────────────────────── */
function paintLevelRing(buf, frame) {
    buf.clear();
    const c = 36, t = frame / 3;
    const R = 12 + t * 22;
    for (let i = 0; i < 260; i++) {
        const a = (i / 260) * 6.283;
        for (let k = -1; k <= 1; k++) {
            const rr = R + k * 1.2;
            const al = (1 - Math.abs(k) * 0.4) * (1 - t * 0.55);
            buf.set(Math.round(c + Math.cos(a) * rr), Math.round(c + Math.sin(a) * rr * 0.66), k === 0 ? P.gold[3] : P.gold[1], al);
        }
    }
    // runes riding the ring
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + t * 2;
        const x = Math.round(c + Math.cos(a) * R), y = Math.round(c + Math.sin(a) * R * 0.66);
        buf.rect(x - 1, y - 2, 3, 4, P.gold[4], 1 - t * 0.5);
        buf.set(x, y, P.amber[5], 1 - t * 0.4);
    }
    // inner flash
    if (frame === 0) { buf.circle(c, c, 8, P.gold[4], true); }
    // sparks
    for (let i = 0; i < 14; i++) {
        const a = hash2(i, 3, 7) * 6.283;
        const rr = R * (0.6 + hash2(i, 5, 11) * 0.5);
        buf.set(Math.round(c + Math.cos(a) * rr), Math.round(c + Math.sin(a) * rr * 0.66), P.gold[3], (1 - t) * 0.8);
    }
}

/* ─── shockwave ring (nova / boss slam) ──────────────────────────── */
function paintNovaRing(buf, size, colors, frame, squash = 0.62) {
    buf.clear();
    const c = size / 2, t = frame / 3;
    const R = size * 0.16 + t * size * 0.34;
    const thick = 3.4 * (1 - t * 0.5);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = Math.hypot(x - c, (y - c) / squash);
            const k = Math.abs(d - R);
            if (k < thick) {
                const a = (1 - k / thick) * (1 - t * 0.7);
                buf.set(x, y, k < thick * 0.35 ? colors[2] : colors[1], a);
            } else if (d < R && t < 0.5) {
                buf.set(x, y, colors[0], 0.12 * (1 - t * 2));
            }
        }
    }
    // leading sparks
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * 6.283 + t;
        buf.set(Math.round(c + Math.cos(a) * R * 1.05), Math.round(c + Math.sin(a) * R * 1.05 * squash), colors[2], (1 - t) * 0.9);
    }
}

/* ─── ground decals ──────────────────────────────────────────────── */
function paintDecal(buf, w, h, colors, seed, splats, shine) {
    buf.clear();
    buf.ellipse(w / 2, h / 2, w * 0.36, h * 0.36, colors[0], true, 0.92);
    for (let i = 0; i < splats; i++) {
        const a = hash2(i, seed, 3) * 6.283;
        const r = hash2(i, seed, 7) * w * 0.42;
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r * 0.7;
        const rr = 1 + hash2(i, seed, 11) * 3;
        buf.ellipse(x, y, rr, rr * 0.7, colors[1], true, 0.9);
        if (shine) { buf.set(Math.round(x - rr * 0.3), Math.round(y - rr * 0.3), colors[2], 0.55); }
    }
    // droplets
    for (let i = 0; i < 6; i++) {
        const x = Math.round(hash2(i, seed + 31, 5) * w);
        const y = Math.round(hash2(i, seed + 17, 9) * h);
        buf.set(x, y, colors[1], 0.8);
    }
}

/* ─── frost patch ────────────────────────────────────────────────── */
function paintFrost(buf, frame) {
    buf.clear();
    const c = 15;
    buf.ellipse(c, 10, 14, 8, P.cyan[0], true, 0.5);
    buf.ellipse(c, 10, 11, 6, P.cyan[1], true, 0.45);
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283;
        const r = 5 + hash2(i, frame, 3) * 8;
        buf.line(c, 10, Math.round(c + Math.cos(a) * r), Math.round(10 + Math.sin(a) * r * 0.6), P.cyan[3], 0.75);
        const bx = Math.round(c + Math.cos(a) * r * 0.6), by = Math.round(10 + Math.sin(a) * r * 0.36);
        buf.set(bx + 1, by - 1, P.cyan[4], 0.7);
        buf.set(bx - 1, by + 1, P.cyan[2], 0.6);
    }
    buf.ellipse(c, 10, 3, 2, P.cyan[4], true, 0.6);
}

/* ─── dust / dash puff ───────────────────────────────────────────── */
function paintDust(buf, frame) {
    buf.clear();
    const t = frame / 2;
    for (let i = 0; i < 5; i++) {
        const x = 2 + i * 2 + t * (i % 2 ? 2 : -2);
        const y = 5 + Math.sin(i + t * 3) * 1.5 - t * 2;
        buf.circle(Math.round(x), Math.round(y), 1.6 + t, mix(P.dirt[2], P.stone[2], 0.5), true);
        buf.set(Math.round(x), Math.round(y), P.stone[3], 0.4 * (1 - t));
    }
}

/* ─── crit star ──────────────────────────────────────────────────── */
function paintCritStar(buf) {
    buf.clear();
    const c = 6;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * 6.283 + 0.78;
        for (let r = 1; r <= 6; r++) {
            const x = Math.round(c + Math.cos(a) * r), y = Math.round(c + Math.sin(a) * r);
            buf.set(x, y, r < 3 ? P.gold[4] : P.gold[3]);
            buf.set(x + 1, y, P.gold[2], 0.7);
            buf.set(x, y + 1, P.gold[2], 0.7);
        }
    }
    buf.circle(c, c, 2.4, P.gold[4], true);
    buf.set(c, c, 0xffffff);
    buf.set(c - 1, c, 0xffffff); buf.set(c, c - 1, 0xffffff);
}

/* ─── heal cross ─────────────────────────────────────────────────── */
function paintHeal(buf, frame) {
    buf.clear();
    const c = 6, t = frame % 2;
    const col = t ? P.ghost[3] : P.ghost[2];
    buf.rect(c - 1, 1, 3, 11, col);
    buf.rect(1, c - 1, 11, 3, col);
    buf.rect(c - 1, c - 1, 3, 3, 0xffffff, 0.9);
    buf.set(c, 0, col, 0.6); buf.set(c, 12, col, 0.6);
    buf.set(0, c, col, 0.6); buf.set(12, c, col, 0.6);
}

/* ─── ambient motes ──────────────────────────────────────────────── */
function paintMote(buf, frame, color) {
    buf.clear();
    const c = 3, t = frame % 2;
    buf.circle(c, c, t ? 2.2 : 1.6, color, true);
    buf.set(c, c, 0xffffff, 0.85);
    buf.set(c - 1, c, color, 0.6);
    buf.set(c + 1, c, color, 0.6);
}

function paintLeaf(buf, frame) {
    buf.clear();
    const f = frame % 2;
    buf.ellipse(4, 3 + f, 3.4, 1.8 + f * 0.4, P.moss[2]);
    buf.ellipse(4, 3 + f, 2, 1, P.moss[3]);
    buf.line(1, 3 + f, 7, 3 + f, P.moss[1], 0.8);
}

function paintBloodDrop(buf, frame) {
    buf.clear();
    const f = frame % 2;
    buf.ellipse(3, 3 + f, 2, 2.4 + f * 0.6, P.blood[1]);
    buf.ellipse(3, 3 + f, 1.2, 1.4, P.blood[2]);
    buf.set(2, 2 + f, P.blood[3], 0.9);
}

/* ─── fog puff (big, soft, drifting) ─────────────────────────────── */
function paintFog(buf, frame) {
    buf.clear();
    const c = 24;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.283 + frame * 0.4;
        const x = c + Math.cos(a) * 10;
        const y = 16 + Math.sin(a) * 5;
        buf.blob(x, y, 13, 7, P.night[2], { seed: 3 + i + frame, jitter: 0.2, lobes: 3 });
    }
    buf.blob(c, 16, 15, 8, P.night[3], { seed: 21 + frame, jitter: 0.18, lobes: 4 });
    // soften
    for (let y = 0; y < buf.height; y++) {
        for (let x = 0; x < buf.width; x++) {
            const d = Math.hypot((x - c) / 26, (y - 16) / 15);
            if (d > 0.55) { buf.set(x, y, P.night[2], Math.max(0, (1 - d) * 0.5)); }
        }
    }
}

/* ─── misc single-purpose sprites ────────────────────────────────── */
const paintSoftGlow = (buf) => softDot(32, 0xffffff, 2.1).blit(buf, 0, 0) || buf;
const paintFlash = (buf) => softDot(28, 0xffffff, 1.2).blit(buf, 0, 0) || buf;
const paintShadow = (buf) => shadowSprite(28, 14, 0.55).blit(buf, 0, 0) || buf;

export const FX_SPRITES = [
    { key: 'hit_spark', w: 16, h: 16, frames: ['hit_spark_0', 'hit_spark_1', 'hit_spark_2', 'hit_spark_3'], paint: paintHitSpark },
    { key: 'slash', w: 32, h: 32, frames: ['slash_0', 'slash_1', 'slash_2', 'slash_3'], paint: paintSlash },
    { key: 'explosion', w: 52, h: 52, frames: ['explosion_0', 'explosion_1', 'explosion_2', 'explosion_3', 'explosion_4', 'explosion_5'], paint: paintExplosion },
    { key: 'smoke', w: 20, h: 20, frames: ['smoke_0', 'smoke_1', 'smoke_2', 'smoke_3'], paint: paintSmoke },
    { key: 'soul', w: 14, h: 16, frames: ['soul_0', 'soul_1', 'soul_2', 'soul_3'], paint: paintSoul },
    { key: 'level_ring', w: 72, h: 72, frames: ['level_ring_0', 'level_ring_1', 'level_ring_2', 'level_ring_3'], paint: paintLevelRing },
    { key: 'nova_ring', w: 72, h: 72, frames: ['nova_ring_0', 'nova_ring_1', 'nova_ring_2', 'nova_ring_3'], paint: (b, f) => paintNovaRing(b, 72, [P.ember[1], P.amber[2], P.amber[4]], f) },
    { key: 'frost_ring', w: 72, h: 72, frames: ['frost_ring_0', 'frost_ring_1', 'frost_ring_2', 'frost_ring_3'], paint: (b, f) => paintNovaRing(b, 72, [P.cyan[0], P.cyan[2], P.cyan[4]], f) },
    { key: 'slam_ring', w: 80, h: 80, frames: ['slam_ring_0', 'slam_ring_1', 'slam_ring_2', 'slam_ring_3'], paint: (b, f) => paintNovaRing(b, 80, [P.violet[0], P.violet[2], P.violet[4]], f, 0.58) },
    { key: 'decal_blood', w: 24, h: 16, frames: ['decal_blood_0', 'decal_blood_1', 'decal_blood_2', 'decal_blood_3'], paint: (b, f) => paintDecal(b, 24, 16, [P.blood[0], P.blood[1], P.blood[2]], 3 + f * 7, 7, true) },
    { key: 'decal_goo', w: 26, h: 18, frames: ['decal_goo_0', 'decal_goo_1', 'decal_goo_2'], paint: (b, f) => paintDecal(b, 26, 18, [P.violet[0], 0x2a1a3f, P.violet[1]], 11 + f * 13, 8, false) },
    { key: 'decal_scorch', w: 34, h: 22, frames: ['decal_scorch_0', 'decal_scorch_1', 'decal_scorch_2'], paint: (b, f) => paintDecal(b, 34, 22, [0x241a1c, 0x382a2c, P.ember[2]], 23 + f * 5, 6, true) },
    { key: 'decal_ash', w: 30, h: 20, frames: ['decal_ash_0', 'decal_ash_1'], paint: (b, f) => paintDecal(b, 30, 20, [0x2a2a33, 0x3d3d4a, 0x585868], 41 + f * 3, 9, true) },
    { key: 'frost_patch', w: 30, h: 20, frames: ['frost_patch_0', 'frost_patch_1'], paint: paintFrost },
    { key: 'dust', w: 14, h: 10, frames: ['dust_0', 'dust_1', 'dust_2'], paint: paintDust },
    { key: 'crit_star', w: 13, h: 13, frames: ['crit_star_0'], paint: paintCritStar },
    { key: 'heal', w: 13, h: 13, frames: ['heal_0', 'heal_1'], paint: paintHeal },
    { key: 'mote_amber', w: 7, h: 7, frames: ['mote_amber_0', 'mote_amber_1'], paint: (b, f) => paintMote(b, f, P.amber[3]) },
    { key: 'mote_cyan', w: 7, h: 7, frames: ['mote_cyan_0', 'mote_cyan_1'], paint: (b, f) => paintMote(b, f, P.cyan[2]) },
    { key: 'leaf', w: 9, h: 8, frames: ['leaf_0', 'leaf_1'], paint: paintLeaf },
    { key: 'blood_drop', w: 7, h: 8, frames: ['blood_drop_0', 'blood_drop_1'], paint: paintBloodDrop },
    { key: 'fog_puff', w: 48, h: 32, frames: ['fog_puff_0', 'fog_puff_1', 'fog_puff_2'], paint: paintFog },
    { key: 'soft_glow', w: 32, h: 32, frames: ['soft_glow'], paint: (b) => { b.clear(); b.blit(softDot(32, 0xffffff, 2.0), 0, 0); } },
    { key: 'hard_glow', w: 24, h: 24, frames: ['hard_glow'], paint: (b) => { b.clear(); b.blit(softDot(24, 0xffffff, 1.1), 0, 0); } },
    { key: 'flash', w: 28, h: 28, frames: ['flash'], paint: (b) => { b.clear(); b.blit(softDot(28, 0xffffff, 0.85), 0, 0); } },
    { key: 'shadow', w: 28, h: 14, frames: ['shadow'], paint: (b) => { b.clear(); b.blit(shadowSprite(28, 14, 0.5), 0, 0); } },
    { key: '__WHITE', w: 1, h: 1, frames: ['__WHITE'], paint: (b) => { b.clear(); b.set(0, 0, 0xffffff); } }
];

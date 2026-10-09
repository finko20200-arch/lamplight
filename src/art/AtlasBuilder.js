import { PixelBuffer } from './PixelBuffer.js';
import { SPRITE_GROUPS } from './registry.js';
import { makeGroundCombined } from './terrain.js';

/**
 * Packs every procedural sprite into texture atlases and registers them as
 * Phaser textures + animations. The exact same pixel data is what the Node
 * art-QA tool renders to PNG, so what you review is what you ship.
 */

const SHEET = 1024;

function packSheets(items) {
    items.sort((a, b) => b.buf.height - a.buf.height || b.buf.width - a.buf.width);
    const sheets = [];
    let sheet = null, x = 2, y = 2, rowH = 0;
    const newSheet = () => {
        sheet = { buffer: new PixelBuffer(SHEET, SHEET), frames: [] };
        sheets.push(sheet);
        x = 2; y = 2; rowH = 0;
    };
    newSheet();
    for (const it of items) {
        if (x + it.buf.width + 2 > SHEET) { x = 2; y += rowH + 2; rowH = 0; }
        if (y + it.buf.height + 2 > SHEET) { newSheet(); }
        sheet.buffer.blit(it.buf, x, y);
        sheet.frames.push({ name: it.name, x, y, w: it.buf.width, h: it.buf.height });
        x += it.buf.width + 2;
        rowH = Math.max(rowH, it.buf.height);
    }
    return sheets;
}

export function buildSprites(scene) {
    const items = [];
    for (const group of SPRITE_GROUPS) {
        for (const def of group.sprites) {
            const n = Array.isArray(def.frames) ? def.frames.length : 1;
            for (let f = 0; f < n; f++) {
                const buf = new PixelBuffer(def.w, def.h);
                def.paint(buf, f);
                const name = Array.isArray(def.frames) ? def.frames[f] : `${def.key}_${f}`;
                items.push({ name, buf });
            }
        }
    }
    const sheets = packSheets(items);
    sheets.forEach((sheet, i) => {
        const key = i === 0 ? 'atlas' : `atlas${i}`;
        const ct = scene.textures.createCanvas(key, SHEET, SHEET);
        const ctx = ct.getContext();
        ctx.putImageData(sheet.buffer.toImageData(ImageData), 0, 0);
        ct.refresh();
        for (const f of sheet.frames) {
            ct.add(f.name, 0, f.x, f.y, f.w, f.h);
        }
    });
    return sheets.length;
}

export function buildTerrain(scene) {
    const ground = makeGroundCombined(512, 7);
    const ct = scene.textures.createCanvas('ground', 512, 512);
    ct.getContext().putImageData(ground.toImageData(ImageData), 0, 0);
    ct.refresh();
}

/** Frames helper — every frame name of a sprite key, in order. */
export function framesOf(key, count) {
    const out = [];
    for (let i = 0; i < count; i++) { out.push(`${key}_${i}`); }
    return out;
}

export function buildVignette(scene) {
    const W = 320, H = 180;
    const buf = new PixelBuffer(W, H);
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const d = Math.hypot((x - cx) / (W * 0.62), (y - cy) / (H * 0.62));
            const a = Math.max(0, Math.min(1, (d - 0.55) / 0.75));
            const v = Math.pow(a, 1.6) * 0.85;
            buf.set(x, y, [10, 8, 20], v);
        }
    }
    const ct = scene.textures.createCanvas('vignette', W, H);
    ct.getContext().putImageData(buf.toImageData(ImageData), 0, 0);
    ct.refresh();
}

export function buildAnimations(scene) {
    const A = (key, frames, rate, repeat = -1) => {
        if (!scene.anims.exists(key)) {
            scene.anims.create({ key, frames: frames.map(f => ({ key: 'atlas', frame: f })), frameRate: rate, repeat });
        }
    };

    A('hero_idle', ['hero_idle_0', 'hero_idle_1'], 3);
    A('hero_walk', ['hero_walk_0', 'hero_walk_1', 'hero_walk_2', 'hero_walk_3'], 9);
    A('hero_dash', ['hero_dash'], 8);
    A('hero_hurt', ['hero_hurt'], 8);

    for (const key of ['shade', 'wisp', 'husk', 'spitter', 'bomber', 'crawler']) {
        A(key, framesOf(key, 4), 8);
    }
    A('boss', framesOf('boss', 4), 6);
    A('boss_atk', ['boss_atk_0', 'boss_atk_1'], 5);
    A('elite_aura', framesOf('elite_aura', 4), 10);
    A('elite_crown', framesOf('elite_crown', 2), 6);
    A('portal', framesOf('portal', 4), 12);

    A('tree_dead', framesOf('tree_dead', 2), 1);
    A('mushrooms', framesOf('mushrooms', 2), 2);
    A('grave', framesOf('grave', 2), 1);
    A('lantern_post', framesOf('lantern_post', 4), 5);
    A('crystal', framesOf('crystal', 2), 2);
    A('pillar', framesOf('pillar', 2), 1);
    A('candles', framesOf('candles', 3), 4);
    A('grass', framesOf('grass', 2), 1);
    A('flower', framesOf('flower', 2), 2);
    A('puddle', framesOf('puddle', 2), 2);

    A('ember_s', framesOf('ember_s', 2), 6);
    A('ember_m', framesOf('ember_m', 2), 6);
    A('ember_l', framesOf('ember_l', 2), 6);
    A('flask', framesOf('flask', 2), 4);
    A('magnet', framesOf('magnet', 2), 6);
    A('bomb', framesOf('bomb', 2), 6);
    A('chest', framesOf('chest', 3), 6);
    A('coin', framesOf('coin', 4), 10);

    A('spark', framesOf('spark', 3), 14);
    A('blade', framesOf('blade', 2), 14);
    A('lance', framesOf('lance', 2), 14);
    A('orb', framesOf('orb', 3), 12);
    A('rune_sigil', framesOf('rune_sigil', 4), 8);
    A('flask_proj', framesOf('flask_proj', 2), 10);
    A('fire_patch', framesOf('fire_patch', 4), 10);
    A('spit', framesOf('spit', 2), 10);
    A('boss_orb', framesOf('boss_orb', 3), 12);
    A('shard', framesOf('shard', 2), 10);

    A('hit_spark', framesOf('hit_spark', 4), 24, 0);
    A('slash', framesOf('slash', 4), 22, 0);
    A('explosion', framesOf('explosion', 6), 20, 0);
    A('smoke', framesOf('smoke', 4), 12, 0);
    A('soul', framesOf('soul', 4), 10, 0);
    A('level_ring', framesOf('level_ring', 4), 14, 0);
    A('nova_ring', framesOf('nova_ring', 4), 16, 0);
    A('frost_ring', framesOf('frost_ring', 4), 16, 0);
    A('slam_ring', framesOf('slam_ring', 4), 16, 0);
    A('dust', framesOf('dust', 3), 12, 0);
    A('heal', framesOf('heal', 2), 6, 0);
    A('crit_star', ['crit_star_0'], 8, 0);
    A('mote_amber', framesOf('mote_amber', 2), 8);
    A('mote_cyan', framesOf('mote_cyan', 2), 8);
    A('leaf', framesOf('leaf', 2), 4);
    A('fog_puff', framesOf('fog_puff', 3), 1);
}

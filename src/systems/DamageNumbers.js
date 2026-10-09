import { GLYPH_FRAME, GLYPH_SPRITES } from '../art/sprites/digits.js';
import { GLYPH_W } from '../art/glyphs.js';
import { Save } from '../core/Save.js';

/**
 * Floating combat text built from the 3x5 pixel glyph sprites — razor sharp
 * at any zoom and allocation-free (fixed pool of containers).
 */

const KINDS = {
    hit: { color: 0xfff0d8, scale: 1, rise: 26, life: 0.62 },
    crit: { color: 0xffd75e, scale: 1.8, rise: 34, life: 0.8 },
    hurt: { color: 0xff5470, scale: 1.4, rise: 24, life: 0.7 },
    heal: { color: 0x8ef2a8, scale: 1.2, rise: 26, life: 0.7 },
    xp: { color: 0x8ee6ff, scale: 1, rise: 22, life: 0.5 },
    gold: { color: 0xffc93c, scale: 1, rise: 22, life: 0.6 },
    frost: { color: 0xb7f5ff, scale: 1, rise: 26, life: 0.62 },
    fire: { color: 0xff8a2b, scale: 1, rise: 26, life: 0.62 }
};

class DmgNumber {
    constructor(scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(9800);
        this.digits = [];
        for (let i = 0; i < 7; i++) {
            const im = scene.add.image(0, 0, 'atlas', 'g_0');
            im.setVisible(false);
            this.container.add(im);
            this.digits.push(im);
        }
        this.life = 0;
        this.active = false;
    }

    show(text, x, y, kind) {
        const k = KINDS[kind] || KINDS.hit;
        const str = String(text);
        const w = (GLYPH_W + 1) * k.scale;
        const total = str.length * w;
        for (let i = 0; i < this.digits.length; i++) {
            const d = this.digits[i];
            if (i < str.length) {
                const frame = GLYPH_FRAME[str[i]];
                d.setFrame(frame || 'g_0');
                d.setVisible(true);
                d.setTint(k.color);
                d.setScale(k.scale);
                d.setPosition(i * w - total / 2 + w / 2, 0);
                d.setAlpha(1);
            } else {
                d.setVisible(false);
            }
        }
        this.container.setPosition(x, y).setVisible(true).setAlpha(1);
        this.life = k.life;
        this.rise = k.rise;
        this.active = true;
        this.scale = k.scale;
        // pop
        this.container.setScale(k.kind === 'crit' ? 1.3 : 1);
        this.scene.tweens.add({ targets: this.container, scale: k.scale === 1.8 ? 1 : 0.9, duration: 120, ease: 'Back.Out' });
    }

    update(dt) {
        if (!this.active) { return; }
        this.life -= dt;
        this.container.y -= this.rise * dt;
        this.rise *= (1 - dt * 2);
        if (this.life < 0.25) { this.container.setAlpha(Math.max(0, this.life / 0.25)); }
        if (this.life <= 0) {
            this.active = false;
            this.container.setVisible(false);
        }
    }

    destroy() { this.container.destroy(true); }
}

export class DamageNumbers {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        for (let i = 0; i < 40; i++) { this.pool.push(new DmgNumber(scene)); }
    }

    show(value, x, y, kind = 'hit') {
        if (kind === 'hit' && !Save.get('showDamage', true)) { return; }
        let n = null;
        for (const p of this.pool) { if (!p.active) { n = p; break; } }
        if (!n) { n = this.pool[0]; }
        n.show(value, x, y, kind);
    }

    update(dt) {
        for (const p of this.pool) { p.update(dt); }
    }

    clear() {
        for (const p of this.pool) { p.active = false; p.container.setVisible(false); }
    }

    destroy() {
        for (const p of this.pool) { p.destroy(); }
    }
}

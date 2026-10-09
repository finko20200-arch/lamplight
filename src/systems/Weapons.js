import { WEAPONS } from '../data/game.js';
import { Audio } from '../core/Audio.js';

/**
 * Weapon behaviours. One class per archetype; evolutions are the same class
 * with boosted tables + flags (burn / trail / scorch).
 */

export class Weapon {
    constructor(scene, key) {
        this.scene = scene;
        this.key = key;
        this.level = 1;
        this.cd = 0.4;
        this.t = 0;
    }

    get def() { return WEAPONS[this.key]; }
    get stats() { return this.def.levels[Math.min(this.level, this.def.levels.length) - 1]; }
    get icon() { return this.def.icon; }
    get name() { return this.def.name; }

    levelUp() { this.level = Math.min(this.def.max, this.level + 1); this.onLevel(); }
    onLevel() { }

    update(dt, ctx) {
        this.t += dt;
        this.cd -= dt * ctx.stats.atkSpeed;
        if (this.cd <= 0) {
            this.fire(ctx);
        }
    }

    fire(ctx) { this.cd = this.stats.cd * ctx.stats.cdMul; }

    destroy() { }
}

/* ─── Lantern Sparks — homing bolts ─────────────────────────────── */
class Sparks extends Weapon {
    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const count = s.count + ctx.stats.proj;
        const targets = ctx.grid.nearestN(ctx.player.x, ctx.player.y, 480, count, e => !e.dead);
        if (!targets.length) {
            // fire forward anyway so the weapon never feels dead
            targets.push({ x: ctx.player.x + ctx.player.facing * 200, y: ctx.player.y });
        }
        for (const t of targets) {
            const a = Math.atan2(t.y - ctx.player.y, t.x - ctx.player.x) + (Math.random() - 0.5) * 0.3;
            ctx.game.spawnShot({
                kind: 'spark', x: ctx.player.x, y: ctx.player.y - 4,
                vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
                dmg: s.dmg * ctx.stats.dmg, pierce: s.pierce, life: 1.8,
                homing: 3.2, radius: 6, burn: s.burn ? { dps: s.burn * ctx.stats.dmg, dur: 2 } : null,
                src: this.key
            });
        }
        Audio.play('shoot');
        const a0 = Math.atan2((targets[0].y || ctx.player.y) - ctx.player.y, (targets[0].x || ctx.player.x + ctx.player.facing * 100) - ctx.player.x);
        ctx.game.fx.muzzle(ctx.player.x + Math.cos(a0) * 10 * ctx.player.facing, ctx.player.y - 4 + Math.sin(a0) * 6, a0 * 57.2958);
    }
}

/* ─── Whirling Blades — orbiting cutters ────────────────────────── */
class Blades extends Weapon {
    constructor(scene, key) {
        super(scene, key);
        this.angle = 0;
        this.blades = [];
    }

    onLevel() { this.sync(); }

    sync(ctx) {
        const want = this.stats.count;
        while (this.blades.length < want) {
            const b = this.scene.add.sprite(0, 0, 'atlas', 'blade_0');
            b.play('blade');
            b.setDepth(9000).setBlendMode(Phaser.BlendModes.NORMAL);
            this.blades.push(b);
        }
        while (this.blades.length > want) {
            this.blades.pop().destroy();
        }
    }

    update(dt, ctx) {
        if (this.blades.length !== this.stats.count) { this.sync(ctx); }
        const s = this.stats;
        this.angle += s.spin * dt * ctx.stats.atkSpeed;
        const R = s.radius * ctx.stats.area;
        const dmg = s.dmg * ctx.stats.dmg;
        for (let i = 0; i < this.blades.length; i++) {
            const a = this.angle + (i / this.blades.length) * Math.PI * 2;
            const x = ctx.player.x + Math.cos(a) * R;
            const y = ctx.player.y + Math.sin(a) * R * 0.86;
            const b = this.blades[i];
            b.setPosition(x, y);
            b.setAngle(a * 57.2958 + 90);
            b.setDepth(2000 + y + 20);
            // hit check
            const near = ctx.grid.query(x, y, 16, Blades._q || (Blades._q = []));
            for (const e of near) {
                if (e.dead || (e.hitCd[this.key] || 0) > 0) { continue; }
                e.hitCd[this.key] = s.cd * 0.9;
                const dx = e.x - ctx.player.x, dy = e.y - ctx.player.y;
                const d = Math.hypot(dx, dy) || 1;
                e.damage(dmg, {
                    crit: ctx.game.rollCrit(), knock: 90, kx: dx / d, ky: dy / d,
                    burn: s.trail ? { dps: 10 * ctx.stats.dmg, dur: 1.5 } : null, source: this.key
                });
                Audio.play('blade');
            }
            if (s.trail && Math.random() < dt * 8) {
                ctx.game.fx.ember(x, y);
            }
        }
    }

    destroy() { this.blades.forEach(b => b.destroy()); this.blades.length = 0; }
}

/* ─── Ember Nova — expanding ring ───────────────────────────────── */
class Nova extends Weapon {
    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const R = s.radius * ctx.stats.area;
        const dmg = s.dmg * ctx.stats.dmg;
        const ring = s.scorch ? 'nova_ring' : 'nova_ring';
        const fx = ctx.game.fx.play(ring, ctx.player.x, ctx.player.y, { blend: Phaser.BlendModes.ADD, depth: 9400 });
        ctx.game.tweens.add({ targets: fx, scale: (R * 2) / 72, duration: 260, ease: 'Cubic.Out' });
        if (s.scorch) {
            const fx2 = ctx.game.fx.play('slam_ring', ctx.player.x, ctx.player.y, { blend: Phaser.BlendModes.ADD, depth: 9390, tint: 0xff8a2b });
            ctx.game.tweens.add({ targets: fx2, scale: (R * 1.5) / 80, duration: 380, ease: 'Cubic.Out' });
        }
        const near = ctx.grid.query(ctx.player.x, ctx.player.y, R, Nova._q || (Nova._q = []));
        for (const e of near) {
            if (e.dead) { continue; }
            const dx = e.x - ctx.player.x, dy = e.y - ctx.player.y;
            const d = Math.hypot(dx, dy) || 1;
            e.damage(dmg, {
                crit: ctx.game.rollCrit(), knock: s.knock, kx: dx / d, ky: dy / d,
                burn: s.scorch ? { dps: 16 * ctx.stats.dmg, dur: 2.5 } : null, source: this.key
            });
        }
        if (s.scorch && Math.random() < 0.8) { ctx.game.fx.scorch(ctx.player.x + (Math.random() - 0.5) * R, ctx.player.y + (Math.random() - 0.5) * R * 0.7); }
        Audio.play('nova');
        ctx.game.fx.shake(3, 120);
    }
}

/* ─── Binding Runes — ground sigils ─────────────────────────────── */
class Runes extends Weapon {
    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const zones = ctx.game.zones.filter(z => z.src === this.key && !z.dead);
        if (zones.length >= s.max) { return; }
        const spot = ctx.grid.densestPoint(ctx.player.x, ctx.player.y, 420, 70)
            || { x: ctx.player.x + (Math.random() - 0.5) * 240, y: ctx.player.y + (Math.random() - 0.5) * 240 };
        ctx.game.addZone({
            kind: 'rune', src: this.key, x: spot.x, y: spot.y,
            radius: s.radius * ctx.stats.area, dps: s.dps * ctx.stats.dmg,
            dur: s.dur, slow: { f: 0.35, dur: 0.5 }
        });
        Audio.play('spit');
    }
}

/* ─── Frost Lance — piercing beam ───────────────────────────────── */
class Lance extends Weapon {
    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const count = 1 + Math.floor(ctx.stats.proj / 2);
        const target = ctx.grid.nearest(ctx.player.x, ctx.player.y, 520, e => !e.dead);
        const baseA = target
            ? Math.atan2(target.y - ctx.player.y, target.x - ctx.player.x)
            : (ctx.player.facing > 0 ? 0 : Math.PI);
        for (let i = 0; i < count; i++) {
            const a = baseA + (i - (count - 1) / 2) * 0.22;
            ctx.game.spawnShot({
                kind: 'lance', x: ctx.player.x, y: ctx.player.y - 2,
                vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
                dmg: s.dmg * ctx.stats.dmg, pierce: s.pierce, life: 0.9,
                radius: 8, angle: a * 57.2958,
                slow: { f: s.slow, dur: s.slowDur }, src: this.key
            });
        }
        Audio.play('lance');
        ctx.game.fx.frostBurst(ctx.player.x + Math.cos(baseA) * 16, ctx.player.y + Math.sin(baseA) * 16);
    }
}

/* ─── Fire Flasks — thrown burn zones ───────────────────────────── */
class Flasks extends Weapon {
    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const count = s.count + Math.min(2, Math.floor(ctx.stats.proj / 2));
        const targets = ctx.grid.nearestN(ctx.player.x, ctx.player.y, 360, count, e => !e.dead);
        for (let i = 0; i < count; i++) {
            const t = targets[i] || {
                x: ctx.player.x + (Math.random() - 0.5) * 260,
                y: ctx.player.y + (Math.random() - 0.5) * 260
            };
            const a = Math.atan2(t.y - ctx.player.y, t.x - ctx.player.x);
            const dist = Math.hypot(t.x - ctx.player.x, t.y - ctx.player.y);
            ctx.game.spawnShot({
                kind: 'flask', x: ctx.player.x, y: ctx.player.y - 6,
                vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
                dmg: s.dmg * ctx.stats.dmg, pierce: 0, life: Math.min(1.4, dist / 260),
                radius: 6, src: this.key,
                onExpire: (shot) => {
                    ctx.game.addZone({
                        kind: 'fire', src: this.key, x: shot.x, y: shot.y,
                        radius: s.radius * ctx.stats.area, dps: s.dps * ctx.stats.dmg, dur: s.dur
                    });
                    ctx.game.fx.explosion(shot.x, shot.y, 0.55);
                    const near = ctx.grid.query(shot.x, shot.y, 40, Flasks._q || (Flasks._q = []));
                    for (const e of near) {
                        if (!e.dead) { e.damage(s.dmg * ctx.stats.dmg, { crit: ctx.game.rollCrit() }); }
                    }
                    Audio.play('fire');
                }
            });
        }
        Audio.play('flask');
        ctx.game.fx.muzzle(ctx.player.x, ctx.player.y - 8, -40);
    }
}

/* ─── Light Whip — frontal arc slash ─────────────────────────────── */
class Whip extends Weapon {
    nearestSide(ctx) {
        const t = ctx.grid.nearest(ctx.player.x, ctx.player.y, 320, e => !e.dead);
        return t ? (t.x >= ctx.player.x ? 1 : -1) : ctx.player.facing;
    }

    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        const dirs = s.both ? [1, -1] : [this.nearestSide(ctx)];
        for (const d of dirs) {
            const x0 = ctx.player.x, y0 = ctx.player.y - 2;
            ctx.game.fx.play('slash', x0 + d * s.range * 0.55, y0, {
                flipX: d < 0, blend: Phaser.BlendModes.ADD, scale: (s.range * 1.15) / 32
            });
            const near = ctx.grid.query(x0 + d * s.range * 0.5, y0, s.range * 0.8, Whip._q || (Whip._q = []));
            for (const e of near) {
                if (e.dead) { continue; }
                const dx = (e.x - x0) * d, dy = e.y - y0;
                if (dx > -8 && dx < s.range && Math.abs(dy) < s.height * 0.5 + e.radius) {
                    e.damage(s.dmg * ctx.stats.dmg, {
                        crit: ctx.game.rollCrit(), knock: s.knock, kx: d, ky: dy * 0.015, source: this.key
                    });
                }
            }
        }
        Audio.play('blade');
        ctx.game.fx.shake(1.5, 60);
    }
}

/* ─── Rune Boomerang — out & back piercer ─────────────────────────── */
class Boom extends Weapon {
    constructor(scene, key) {
        super(scene, key);
        this.booms = [];
    }

    fire(ctx) {
        super.fire(ctx);
        const s = this.stats;
        for (let i = 0; i < s.count; i++) {
            const a = (i / s.count) * 6.283 + Math.random() * 0.7;
            const spr = ctx.scene.add.sprite(ctx.player.x, ctx.player.y, 'atlas', 'blade_0');
            spr.setTint(0xd9a7ff).setDepth(9000).setBlendMode(Phaser.BlendModes.ADD);
            if (ctx.scene.anims.exists('blade')) { spr.play('blade'); }
            this.booms.push({
                spr, a, t: 0, dur: 1.5, range: s.range * (1 + i * 0.07),
                hit: new Set(), pass: 0, dmg: s.dmg * ctx.stats.dmg
            });
        }
        Audio.play('flask');
    }

    update(dt, ctx) {
        this.t += dt;
        this.cd -= dt * ctx.stats.atkSpeed;
        if (this.cd <= 0) { this.fire(ctx); }
        for (let i = this.booms.length - 1; i >= 0; i--) {
            const b = this.booms[i];
            b.t += dt;
            const p = b.t / b.dur;
            if (p >= 1) { b.spr.destroy(); this.booms.splice(i, 1); continue; }
            if (p > 0.5 && b.pass === 0) { b.pass = 1; b.hit.clear(); }
            const dist = Math.sin(p * Math.PI) * b.range;
            const x = ctx.player.x + Math.cos(b.a) * dist;
            const y = ctx.player.y + Math.sin(b.a) * dist * 0.8;
            b.spr.setPosition(x, y);
            b.spr.angle += 620 * dt;
            const near = ctx.grid.query(x, y, 16, Boom._q || (Boom._q = []));
            for (const e of near) {
                if (e.dead || b.hit.has(e)) { continue; }
                b.hit.add(e);
                e.damage(b.dmg, {
                    crit: ctx.game.rollCrit(), source: this.key,
                    knock: 50, kx: Math.cos(b.a), ky: Math.sin(b.a)
                });
            }
        }
    }

    destroy() {
        this.booms.forEach(b => b.spr.destroy());
        this.booms.length = 0;
    }
}

const CLASSES = {
    sparks: Sparks, blades: Blades, nova: Nova, runes: Runes, lance: Lance, flasks: Flasks,
    solar: Sparks, dawnblade: Blades, ashstorm: Nova,
    whip: Whip, boom: Boom
};

export function makeWeapon(scene, key) {
    const C = CLASSES[key] || Weapon;
    const w = new C(scene, key);
    if (WEAPONS[key].evolved) { w.level = 1; }
    return w;
}

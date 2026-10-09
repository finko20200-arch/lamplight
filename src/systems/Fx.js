import { Save } from '../core/Save.js';

/**
 * Pooled one-shot visual effects + particle emitters + camera juice.
 * Everything is object-pooled: a 10-minute run creates ~zero allocations
 * in the hot loop.
 */
export class FxSystem {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        this.active = [];
        this.ghostPool = [];
        this.ghosts = [];

        // particle emitters (created once)
        this.emBlood = scene.add.particles(0, 0, 'atlas', {
            frame: ['blood_drop_0', 'blood_drop_1'],
            speed: { min: 40, max: 140 }, angle: { min: 0, max: 360 },
            lifespan: { min: 250, max: 500 }, scale: { start: 1, end: 0.4 },
            gravityY: 220, frequency: -1, blendMode: 'NORMAL', maxAliveParticles: 90
        }).setDepth(9500);

        this.emSpark = scene.add.particles(0, 0, 'atlas', {
            frame: ['mote_amber_0', 'mote_amber_1'],
            speed: { min: 60, max: 220 }, angle: { min: 0, max: 360 },
            lifespan: { min: 200, max: 450 }, scale: { start: 1.2, end: 0 },
            frequency: -1, blendMode: 'ADD', maxAliveParticles: 120
        }).setDepth(9500);

        this.emFrost = scene.add.particles(0, 0, 'atlas', {
            frame: ['mote_cyan_0', 'mote_cyan_1'],
            speed: { min: 30, max: 120 }, angle: { min: 0, max: 360 },
            lifespan: { min: 300, max: 700 }, scale: { start: 1, end: 0 },
            frequency: -1, blendMode: 'ADD', maxAliveParticles: 90
        }).setDepth(9500);

        this.emLeaf = scene.add.particles(0, 0, 'atlas', {
            frame: ['leaf_0', 'leaf_1'],
            x: { min: -340, max: 340 }, y: { min: -220, max: -160 },
            speedX: { min: -18, max: 10 }, speedY: { min: 14, max: 30 },
            lifespan: { min: 4000, max: 7000 }, scale: { min: 0.7, max: 1.1 },
            rotate: { min: 0, max: 360 }, alpha: { start: 0.7, end: 0 },
            frequency: 900, blendMode: 'NORMAL'
        }).setDepth(9600).setScrollFactor(0);
    }

    obtain(frame) {
        let s = this.pool.pop();
        if (!s) {
            s = this.scene.add.sprite(0, 0, 'atlas', frame);
            s.on('animationcomplete', () => this.release(s));
        } else {
            s.setFrame(frame);
            s.setActive(true).setVisible(true);
        }
        return s;
    }

    release(s) {
        const i = this.active.indexOf(s);
        if (i >= 0) { this.active.splice(i, 1); }
        s.setActive(false).setVisible(false);
        if (s.anims && s.anims.currentAnim) { s.stop(); }
        this.pool.push(s);
    }

    /** Play an animation once at x,y. */
    play(anim, x, y, opts = {}) {
        const cap = (this.scene.budgets && this.scene.budgets.fxActive) || 220;
        if (this.active.length > cap) { this.release(this.active[0]); }
        const s = this.obtain('__WHITE');
        s.setPosition(x, y);
        s.setScale(opts.scale ?? 1);
        s.setAngle(opts.angle ?? 0);
        s.setFlipX(!!opts.flipX);
        s.setAlpha(opts.alpha ?? 1);
        s.setDepth(opts.depth ?? 9500);
        if (opts.tint) { s.setTint(opts.tint); } else { s.clearTint(); }
        s.setBlendMode(opts.blend ?? Phaser.BlendModes.NORMAL);
        if (opts.life) {
            s.__life = opts.life;
            if (opts.frame) { s.setFrame(opts.frame); }
        } else {
            s.__life = 0;
            if (this.scene.anims.exists(anim)) { s.play(anim); }
        }
        this.active.push(s);
        return s;
    }

    /** Persistent sprite (zones, telegraphs) — caller manages lifecycle. */
    make(frame, x, y, opts = {}) {
        const s = this.scene.add.sprite(x, y, 'atlas', frame);
        s.setScale(opts.scale ?? 1).setDepth(opts.depth ?? 1200).setAlpha(opts.alpha ?? 1);
        if (opts.tint) { s.setTint(opts.tint); }
        s.setBlendMode(opts.blend ?? Phaser.BlendModes.NORMAL);
        if (opts.anim && this.scene.anims.exists(opts.anim)) { s.play(opts.anim); }
        return s;
    }

    update(dt) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const s = this.active[i];
            if (s.__life > 0) {
                s.__life -= dt;
                if (s.__life <= 0) { this.release(s); }
            }
        }
        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            const g = this.ghosts[i];
            g.life -= dt;
            g.s.setAlpha(Math.max(0, g.life * 3.4));
            if (g.life <= 0) {
                g.s.setVisible(false);
                this.ghostPool.push(g.s);
                this.ghosts.splice(i, 1);
            }
        }
    }

    /* ── named effects ── */

    hitSpark(x, y, crit) {
        this.play('hit_spark', x, y, { scale: crit ? 1.5 : 1, blend: Phaser.BlendModes.ADD });
        if (crit) { this.play('crit_star', x, y - 2, { blend: Phaser.BlendModes.ADD, scale: 1.3 }); }
        this.emSpark.emitParticleAt(x, y, crit ? 6 : 3);
    }

    bloodBurst(x, y) {
        if (this.emBlood.getAliveParticleCount() < 80) { this.emBlood.emitParticleAt(x, y, 8); }
    }

    ember(x, y) {
        if (this.emSpark.getAliveParticleCount() < 100) { this.emSpark.emitParticleAt(x, y, 1); }
    }

    frostBurst(x, y) {
        if (this.emFrost.getAliveParticleCount() < 70) { this.emFrost.emitParticleAt(x, y, 6); }
    }

    ghost(x, y, facing, tint = 0x7fe3ff) {
        let s = this.ghostPool.pop();
        if (!s) { s = this.scene.add.image(0, 0, 'atlas', 'hero_ghost').setBlendMode(Phaser.BlendModes.ADD); }
        s.setPosition(x, y).setVisible(true).setFlipX(facing < 0).setTint(tint).setDepth(2000 + y - 1);
        this.ghosts.push({ s, life: 0.3 });
    }

    dust(x, y) {
        this.play('dust', x, y, { depth: 1500 });
    }

    spawnPuff(x, y) {
        this.play('smoke', x, y, { scale: 0.7, depth: 2000 + y, alpha: 0.7 });
    }

    explosion(x, y, scale = 1) {
        this.play('explosion', x, y, { scale, blend: Phaser.BlendModes.ADD, depth: 9500 });
        this.play('smoke', x, y - 6, { scale: scale * 1.2, depth: 9400, alpha: 0.8 });
        this.emSpark.emitParticleAt(x, y, 8);
    }

    death(x, y, type, elite) {
        const goo = (type === 'shade' || type === 'wisp' || type === 'spitter' || type === 'boss');
        this.decal(goo ? 'decal_goo' : 'decal_blood', x, y + 4);
        if (type !== 'wisp') { this.play('soul', x, y - 6, { blend: Phaser.BlendModes.ADD }); }
        this.emBlood.emitParticleAt(x, y, goo ? 3 : 6);
        if (elite) { this.play('explosion', x, y, 0.8, { blend: Phaser.BlendModes.ADD }); }
    }

    decal(kind, x, y) {
        const frames = this.scene.textures.get('atlas').getFrameNames();
        const variants = frames.filter(f => f.startsWith(kind + '_'));
        const f = variants.length ? variants[(Math.random() * variants.length) | 0] : kind + '_0';
        const s = this.scene.add.image(x, y, 'atlas', f)
            .setDepth(1000).setAngle(Math.random() * 360)
            .setScale(0.8 + Math.random() * 0.5).setAlpha(kind === 'decal_goo' ? 0.55 : 0.85);
        this.scene.decals.push(s);
        const dcap = (this.scene.budgets && this.scene.budgets.decals) || 90;
        if (this.scene.decals.length > dcap) {
            const old = this.scene.decals.shift();
            old.destroy();
        }
        // decals fade away so the floor never turns into a carpet
        this.scene.tweens.add({
            targets: s, alpha: 0, duration: 5000, delay: 18000,
            onComplete: () => {
                const i = this.scene.decals.indexOf(s);
                if (i >= 0) { this.scene.decals.splice(i, 1); }
                s.destroy();
            }
        });
    }

    scorch(x, y) { this.decal('decal_scorch', x, y); }

    hitDir(x, y, fromX, fromY) {
        const a = Math.atan2(fromY - y, fromX - x) * 57.2958;
        const s = this.play('slash', x, y, { angle: a + 180, scale: 0.9, tint: 0xff5470, blend: Phaser.BlendModes.ADD, depth: 9600 });
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 260 });
    }

    muzzle(x, y, angleDeg) {
        const s = this.play('hit_spark', x, y, { scale: 0.55, angle: angleDeg, blend: Phaser.BlendModes.ADD, depth: 9200 });
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 120 });
    }

    heal(x, y) {
        this.play('heal', x, y, { blend: Phaser.BlendModes.ADD });
    }

    levelRing(x, y) {
        const s = this.play('level_ring', x, y, { blend: Phaser.BlendModes.ADD });
        this.scene.tweens.add({ targets: s, scale: 1.6, duration: 500, ease: 'Cubic.Out' });
    }

    telegraph(x, y, r) {
        const s = this.make('slam_ring_0', x, y, { depth: 1250, tint: 0xff5470, alpha: 0.75, scale: (r * 2) / 80 });
        this.scene.tweens.add({
            targets: s, alpha: 0.25, duration: 120, yoyo: true, repeat: 5,
            onComplete: () => s.destroy()
        });
    }

    slam(x, y) {
        this.play('slam_ring', x, y, { blend: Phaser.BlendModes.ADD, depth: 9450 });
        this.scorch(x, y);
    }

    shake(mag, ms) {
        if (!Save.get('shake', true)) { return; }
        this.scene.cameras.main.shake(ms, Math.min(0.03, mag / 900));
    }

    flash(r, g, b, a = 0.3, ms = 120) {
        this.scene.cameras.main.flash(ms, r, g, b, false, null, this.scene);
    }

    soulBurst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const s = this.play('soul', x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, { blend: Phaser.BlendModes.ADD });
            this.scene.tweens.add({ targets: s, y: s.y - 40 - Math.random() * 40, alpha: 0, duration: 700 + Math.random() * 500, delay: i * 40 });
        }
    }

    destroy() {
        this.active.slice().forEach(s => this.release(s));
        this.ghosts.slice().forEach(g => { g.s.destroy(); });
    }
}

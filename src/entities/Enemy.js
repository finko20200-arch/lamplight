import { ENEMIES, ELITE } from '../data/game.js';
import { EventBus, EV } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

/**
 * One class for the whole bestiary; behaviour selected by `ai` in data/game.js.
 * Pooled by GameScene (spawn/release), so construction happens rarely.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'atlas', 'shade_0');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCircle(8, 0, 0);
        this.hitCd = {};          // per-source tick cooldowns (blades, zones…)
        this.t = Math.random() * 10;
        this.wob = Math.random() * 6.28;
    }

    spawn(type, x, y, opts = {}) {
        const cfg = ENEMIES[type];
        this.type = type;
        this.cfg = cfg;
        this.ai = opts.ai || cfg.ai || 'seek';
        this.elite = !!opts.elite;
        this.tier = opts.tier || 0;

        const hpMul = (opts.hpMul || 1) * (this.elite ? ELITE.hpMul : 1);
        this.maxHp = Math.round(cfg.hp * hpMul);
        this.hp = this.maxHp;
        this.dmg = Math.round(cfg.dmg * (opts.dmgMul || 1) * (this.elite ? ELITE.dmgMul : 1));
        this.radius = cfg.radius * (this.elite ? ELITE.scale : 1);
        this.xp = Math.round(cfg.xp * (this.elite ? ELITE.xpMul : 1) * (opts.xpMul || 1));
        this.gold = cfg.gold * (this.elite ? ELITE.goldMul : 1);
        this.baseSpeed = cfg.speed * (this.elite ? ELITE.speedMul : 1) * (opts.speedMul || 1);

        this.setTexture('atlas', `${cfg.sprite}_0`);
        this.play(cfg.anim, true);
        this.setScale((this.elite ? ELITE.scale : 1) * (opts.scale || 1));
        this.setPosition(x, y);
        this.setActive(true).setVisible(true);
        this.body.enable = true;
        this.body.setCircle(this.radius, this.width / 2 - this.radius, this.height - this.radius * 2 - 2);
        this.body.setVelocity(0, 0);
        this.clearTint();
        this.setAlpha(1);
        this.setAngle(0);
        this.dead = false;
        this.wave = -1;
        this.flashT = 0;
        this.burn = null;
        this.slow = null;
        this.hitCd = {};
        this.fuse = -1;
        this.shootCd = (cfg.shootCd || 2) * (0.6 + Math.random() * 0.8);
        this.t = Math.random() * 10;
        this.spawnT = 0;

        // elite dressing
        if (this.elite && !this.aura) {
            this.aura = this.scene.add.sprite(x, y, 'atlas', 'elite_aura_0')
                .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
            this.aura.play('elite_aura');
            this.crown = this.scene.add.sprite(x, y, 'atlas', 'elite_crown_0');
            this.crown.play('elite_crown');
        } else if (!this.elite) {
            this.aura?.setVisible(false);
            this.crown?.setVisible(false);
        } else {
            this.aura.setVisible(true).setScale(this.scale * 1.1);
            this.crown.setVisible(true).setScale(this.scale);
        }

        // spawn-in wisp
        this.scene.fx.spawnPuff(x, y);
        EventBus.emit(EV.ENEMY_SPAWNED, this);
        return this;
    }

    release() {
        this.setActive(false).setVisible(false);
        if (this.body) { this.body.enable = false; }
        this.aura?.setVisible(false);
        this.crown?.setVisible(false);
        this.dead = true;
    }

    tickCd(key, dt) {
        if (this.hitCd[key] > 0) { this.hitCd[key] -= dt; }
    }

    updateSelf(dt, ctx) {
        this.t += dt;
        this.spawnT += dt;
        this.flashT = Math.max(0, this.flashT - dt);
        for (const k in this.hitCd) { this.tickCd(k, dt); }

        // statuses
        let slowF = 1;
        if (this.slow) {
            this.slow.t -= dt;
            slowF = 1 - this.slow.f;
            if (this.slow.t <= 0) { this.slow = null; }
        }
        if (this.burn) {
            this.burn.t -= dt;
            this.burn.tick -= dt;
            if (this.burn.tick <= 0) {
                this.burn.tick = 0.4;
                this.damage(this.burn.dps * 0.4, { silent: true, source: 'burn' });
                this.scene.fx.ember(this.x, this.y - 4);
            }
            if (this.burn.t <= 0 || this.dead) { this.burn = null; }
        }
        if (this.flashT > 0) {
            this.setTint(0xffffff);
            this.setTintMode(Phaser.TintModes.FILL);
        } else if (this.slow) {
            this.setTint(0x9fdcff);
            this.setTintMode(Phaser.TintModes.MULTIPLY);
        } else if (this.burn) {
            this.setTint(0xff9a5a);
            this.setTintMode(Phaser.TintModes.MULTIPLY);
        } else {
            this.clearTint();
        }
        if (this.dead) { return; }

        const p = ctx.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist, ny = dy / dist;
        let vx = 0, vy = 0;
        const hunt = !!this.scene.director?.hunting;
        const sp = this.baseSpeed * slowF * (hunt ? 1.35 : 1);

        switch (this.ai) {
            case 'zigzag': {
                const s = Math.sin(this.t * 5 + this.wob) * 0.8;
                vx = (nx - ny * s) * sp;
                vy = (ny + nx * s) * sp;
                break;
            }
            case 'swarm': {
                const j = Math.sin(this.t * 9 + this.wob) * 0.5;
                const sw = Math.sin(this.t * 1.6 + this.wob * 2) * 0.55 * (dist > 46 ? 1 : 0.15) * (hunt ? 0.3 : 1);
                vx = (nx - ny * (j * 0.4 + sw)) * sp;
                vy = (ny + nx * (j * 0.4 + sw)) * sp;
                break;
            }
            case 'ranged': {
                this.shootCd -= dt;
                if (hunt) { vx = nx * sp; vy = ny * sp; }
                else if (dist > 260) { vx = nx * sp; vy = ny * sp; }
                else if (dist < 170) { vx = -nx * sp * 0.8; vy = -ny * sp * 0.8; }
                else {
                    const s = Math.sin(this.t * 1.4 + this.wob);
                    vx = -ny * s * sp * 0.7; vy = nx * s * sp * 0.7;
                }
                if (this.shootCd <= 0 && dist < 420) {
                    this.shootCd = this.cfg.shootCd * (0.8 + Math.random() * 0.5);
                    ctx.spawnSpit(this.x, this.y, nx, ny, this.dmg);
                    this.setTint(0xd9a7ff); this.setTintMode(Phaser.TintModes.ADD);
                    this.flashT = 0.08;
                }
                break;
            }
            case 'bomber': {
                if (this.fuse >= 0) {
                    this.fuse -= dt;
                    vx = vy = 0;
                    this.setTint(Math.floor(this.fuse * 14) % 2 ? 0xffffff : 0xff6b3d);
                    this.setTintMode(Phaser.TintModes.ADD);
                    this.flashT = 0.05;
                    if (this.fuse <= 0) { this.explode(ctx); return; }
                } else if (dist < 52) {
                    this.fuse = 0.7;
                    Audio.play('spit');
                } else {
                    vx = nx * sp; vy = ny * sp;
                }
                break;
            }
            case 'tank': {
                const sw = Math.sin(this.t * 0.6 + this.wob) * 0.22;
                vx = (nx - ny * sw) * sp; vy = (ny + nx * sw) * sp;
                break;
            }
            default: {
                // swirl approach: circles in while closing, breaks the "donut"
                const sw = Math.sin(this.t * 0.8 + this.wob) * 0.5 * (dist > 60 ? 1 : 0.2) * (hunt ? 0.3 : 1);
                vx = (nx - ny * sw) * sp;
                vy = (ny + nx * sw) * sp;
                break;
            }
        }

        this.body.setVelocity(vx, vy);
        if (this.cfg.sprite !== 'wisp') {
            this.setFlipX(nx < 0);
        }

        // elite rig follow
        if (this.elite && this.aura?.visible) {
            this.aura.setPosition(this.x, this.y).setDepth(1990 + this.y);
            this.crown.setPosition(this.x, this.y - this.height * this.scale * 0.5 - 10).setScale(this.scale * 0.9).setDepth(2001 + this.y);
        }
        this.setDepth(2000 + this.y);
    }

    explode(ctx) {
        const p = ctx.player;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < 80) { p.hurt(this.dmg, this.x, this.y); }
        this.scene.fx.explosion(this.x, this.y, 0.7);
        this.scene.fx.scorch(this.x, this.y);
        this.scene.fx.shake(6, 200);
        Audio.play('explode');
        // chain damage to neighbours
        const near = ctx.grid.query(this.x, this.y, 70, Enemy._q || (Enemy._q = []));
        for (const e of near) {
            if (e !== this && !e.dead && e.type !== 'boss') { e.damage(this.dmg * 0.6, { silent: true }); }
        }
        this.die({ noDrop: true });
    }

    damage(amount, opts = {}) {
        if (this.dead) { return false; }
        const { crit = false, kx = 0, ky = 0, knock = 0, slow = null, burn = null, silent = false, source = '' } = opts;
        if (crit) { amount *= (this.scene.playerStats?.critMul || 2); }
        if (this.boss) { amount *= 1 + (this.scene.playerStats?.bossDmg || 0); }
        this.scene.addDmgStat(source, amount);
        this.hp -= amount;
        if (!silent) {
            this.flashT = 0.07;
            const elem = (source === 'lance' || this.slow) ? 'frost' : (source === 'flasks' || source === 'fire' || source === 'burn') ? 'fire' : (crit ? 'crit' : 'hit');
            this.scene.dmg.show(Math.round(amount), this.x + (Math.random() - 0.5) * 8, this.y - this.height * this.scale * 0.5, crit && elem === 'hit' ? 'crit' : (crit ? elem : elem));
            this.scene.fx.hitSpark(this.x, this.y - this.height * this.scale * 0.3, crit);
            Audio.play(crit ? 'crit' : 'hit');
        }
        if (knock > 0 && this.type !== 'boss') {
            this.body.setVelocity(this.body.velocity.x + kx * knock, this.body.velocity.y + ky * knock);
        } else if (knock > 0) {
            this.body.setVelocity(this.body.velocity.x + kx * knock * 0.15, this.body.velocity.y + ky * knock * 0.15);
        }
        if (slow) { this.slow = { f: Math.max(this.slow?.f || 0, slow.f), t: slow.dur }; }
        if (burn) { this.burn = { dps: burn.dps, t: burn.dur, tick: 0 }; }
        if (this.hp <= 0) { this.die({ source, quiet: source === 'bomb' }); return true; }
        return true;
    }

    die(opts = {}) {
        if (this.dead) { return; }
        this.dead = true;
        EventBus.emit(EV.ENEMY_KILLED, this);
        const s = this.scene;
        if (opts.quiet) {
            // mass-kill (bomb): keep the screen readable and the frame budget alive
            if (Math.random() < 0.4) { s.loot.dropEmber(this.x, this.y, this.xp >= 5 ? 1 : 0); }
            if (Math.random() < 0.12) { s.fx.death(this.x, this.y, this.type, this.elite); }
        } else {
            s.fx.death(this.x, this.y, this.type, this.elite);
            if (!opts.noDrop) { s.loot.rollDrop(this); }
            Audio.play('kill');
        }
        this.release();
    }
}

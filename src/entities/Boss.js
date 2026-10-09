import { Enemy } from './Enemy.js';
import { EventBus, EV } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

/**
 * THE HOLLOW KING — three-phase boss.
 *   P1 (100-66%):  chase + radial orb rings + wisp summons
 *   P2 (66-33%):   + rotating spiral bursts + ground slams
 *   P3 (<33%):     enraged — denser patterns + charging dashes
 */
export class Boss extends Enemy {
    spawn(tier, x, y, hpMul = 1) {
        super.spawn('boss', x, y, { hpMul: (tier === 2 ? 2.6 : 1) * hpMul, dmgMul: tier === 2 ? 1.4 : 1, xpMul: tier === 2 ? 2 : 1, ai: 'boss' });
        this.tier = tier;
        this.boss = true;
        this.setDepth(2500 + y);
        this.st = { mode: 'enter', t: 1.4, ring: 2.5, summon: 6, spiral: 0, spiralT: 0, slam: 8, slamAt: null, charge: 6, chargeDir: null };
        this.play('boss', true);
        return this;
    }

    get phase() {
        const r = this.hp / this.maxHp;
        return r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
    }

    updateSelf(dt, ctx) {
        if (this.dead) { return; }
        this.t += dt;
        this.flashT = Math.max(0, this.flashT - dt);
        if (this.flashT > 0) { this.setTint(0xffffff); this.setTintMode(Phaser.TintModes.FILL); }
        else { this.clearTint(); }

        const s = this.st;
        const p = ctx.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist, ny = dy / dist;
        const ph = this.phase;
        const speed = [0, 34, 42, 52][ph];

        if (s.mode === 'enter') {
            s.t -= dt;
            this.body.setVelocity(0, 0);
            this.setAlpha(Math.min(1, 1.4 - s.t));
            if (s.t <= 0) { s.mode = 'fight'; this.setAlpha(1); }
            this.setDepth(2500 + this.y);
            return;
        }

        if (s.mode === 'slamTelegraph') {
            s.t -= dt;
            this.body.setVelocity(0, 0);
            this.play('boss_atk', true);
            if (s.t <= 0) {
                // slam!
                const at = s.slamAt;
                ctx.scene.fx.slam(at.x, at.y);
                ctx.scene.fx.shake(9, 300);
                Audio.play('explode');
                if (Math.hypot(p.x - at.x, p.y - at.y) < 96) { p.hurt(this.dmg, at.x, at.y); }
                for (const e of ctx.enemies) {
                    if (!e.dead && e !== this && Math.hypot(e.x - at.x, e.y - at.y) < 96) { e.damage(40, { silent: true }); }
                }
                s.mode = 'fight';
                s.slam = ph === 3 ? 6 : 9;
                this.play('boss', true);
            }
            this.setDepth(2500 + this.y);
            return;
        }

        if (s.mode === 'chargeTelegraph') {
            s.t -= dt;
            this.body.setVelocity(0, 0);
            this.setTint(Math.floor(s.t * 16) % 2 ? 0xd9a7ff : 0xffffff);
            this.setTintMode(Phaser.TintModes.ADD);
            this.flashT = 0.04;
            if (s.t <= 0) { s.mode = 'charge'; s.t = 0.55; s.chargeDir = { x: nx, y: ny }; Audio.play('dash'); }
            this.setDepth(2500 + this.y);
            return;
        }

        if (s.mode === 'charge') {
            s.t -= dt;
            this.body.setVelocity(s.chargeDir.x * 300, s.chargeDir.y * 300);
            ctx.scene.fx.ghost(this.x, this.y, 1, 0xa45cff);
            if (dist < this.radius + 12) { p.hurt(this.dmg, this.x, this.y); }
            if (s.t <= 0) { s.mode = 'fight'; s.charge = 7; this.clearTint(); }
            this.setDepth(2500 + this.y);
            return;
        }

        /* ── fight ── */
        this.play('boss', true);
        this.body.setVelocity(nx * speed, ny * speed);
        this.setFlipX(nx < 0);

        // radial rings
        s.ring -= dt;
        if (s.ring <= 0) {
            s.ring = ph === 1 ? 4.6 : ph === 2 ? 3.8 : 3.0;
            const n = ph === 1 ? 10 : ph === 2 ? 14 : 18;
            const off = Math.random() * 6.28;
            for (let i = 0; i < n; i++) {
                const a = off + (i / n) * 6.283;
                ctx.spawnBossOrb(this.x, this.y, Math.cos(a), Math.sin(a), this.dmg * 0.6);
            }
            Audio.play('nova');
            this.play('boss_atk', true);
        }

        // spiral bursts (P2+)
        if (ph >= 2) {
            if (s.spiralT > 0) {
                s.spiralT -= dt;
                s.spiral += dt;
                if (s.spiral > 0.09) {
                    s.spiral = 0;
                    const a = this.t * 6;
                    ctx.spawnBossOrb(this.x, this.y, Math.cos(a), Math.sin(a), this.dmg * 0.5);
                    ctx.spawnBossOrb(this.x, this.y, Math.cos(a + 3.14), Math.sin(a + 3.14), this.dmg * 0.5);
                }
                if (s.spiralT <= 0) { s.spiralCd = ph === 3 ? 5 : 8; }
            } else {
                s.spiralCd = (s.spiralCd || 6) - dt;
                if (s.spiralCd <= 0) { s.spiralT = 1.6; }
            }

            // slams
            s.slam -= dt;
            if (s.slam <= 0 && dist < 320) {
                s.mode = 'slamTelegraph';
                s.t = 0.9;
                s.slamAt = { x: p.x, y: p.y };
                ctx.scene.fx.telegraph(s.slamAt.x, s.slamAt.y, 96);
                Audio.play('spit');
                this.setDepth(2500 + this.y);
                return;
            }
        }

        // charges (P3)
        if (ph === 3) {
            s.charge -= dt;
            if (s.charge <= 0 && dist > 140 && dist < 420) {
                s.mode = 'chargeTelegraph';
                s.t = 0.6;
                Audio.play('boss');
                this.setDepth(2500 + this.y);
                return;
            }
        }

        // summons
        s.summon -= dt;
        if (s.summon <= 0) {
            s.summon = ph === 1 ? 9 : ph === 2 ? 8 : 7;
            const n = 3 + ph;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * 6.283;
                ctx.summon(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, i % 2 ? 'wisp' : 'shade');
            }
            Audio.play('spit');
        }

        this.setDepth(2500 + this.y);
    }

    die(opts = {}) {
        if (this.dead) { return; }
        this.dead = true;
        this.body.setVelocity(0, 0);
        EventBus.emit(EV.BOSS_KILLED, this);
        const s = this.scene;
        // cinematic death: chain of explosions, then loot
        let i = 0;
        const boom = () => {
            i++;
            s.fx.explosion(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 70, 1.2);
            s.fx.shake(5, 150);
            Audio.play('explode');
            this.setAlpha(Math.max(0, 1 - i / 9));
            if (i < 9) { s.time.delayedCall(110, boom); }
            else {
                s.fx.soulBurst(this.x, this.y, 14);
                s.fx.scorch(this.x, this.y);
                s.loot.dropChest(this.x, this.y, true);
                for (let k = 0; k < 12; k++) { s.loot.dropEmber(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60, 2); }
                this.release();
            }
        };
        s.time.delayedCall(200, boom);
        Audio.play('boss');
    }
}

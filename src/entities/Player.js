import { PLAYER } from '../data/game.js';
import { EventBus, EV } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

/**
 * The Lamplighter. Movement, dash with i-frames, hurt/invulnerability,
 * lantern light rig (shadow + additive light pool + flicker).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'atlas', 'hero_idle_0');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCircle(8, 4, 18);
        this.body.setDrag(600, 600);
        this.body.setMaxVelocity(400, 400);

        this.maxHp = PLAYER.hp;
        this.hp = this.maxHp;
        this.facing = 1;
        this.moving = false;

        this.hurtCd = 0;
        this.invuln = 0;
        this.dashT = 0;
        this.dashCd = 0;
        this.dashDirX = 1;
        this.dashDirY = 0;
        this.regen = PLAYER.regenBase;
        this.animTick = 0;

        // visual rig
        this.shadow = scene.add.image(x, y + 12, 'atlas', 'shadow').setDepth(1400).setAlpha(0.75);
        this.glow = scene.add.image(x, y, 'atlas', 'soft_glow')
            .setDepth(12100).setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xffa040).setScale(4.3).setAlpha(0.34);
        this.coreGlow = scene.add.image(x, y + 4, 'atlas', 'hard_glow')
            .setDepth(12100).setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xffc070).setScale(1.4).setAlpha(0.4);
        this.trail = [];
        this.dashRing = scene.add.graphics().setDepth(2001 + y);
    }

    get speed() { return this.stats ? this.stats.speed : PLAYER.speed; }

    update(dt, input, stats) {
        this.stats = stats;
        this.hurtCd = Math.max(0, this.hurtCd - dt);
        this.invuln = Math.max(0, this.invuln - dt);
        this.dashCd = Math.max(0, this.dashCd - dt);

        // regen
        if (this.regen > 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
        }

        let ix = input.x, iy = input.y;
        const len = Math.hypot(ix, iy);
        if (len > 1) { ix /= len; iy /= len; }
        this.moving = len > 0.05;
        if (this.moving) { this.dashDirX = ix; this.dashDirY = iy; }

        // dash
        if (input.dash && this.dashCd <= 0 && this.dashT <= 0) {
            this.dashT = PLAYER.dash.time;
            this.dashCd = PLAYER.dash.cooldown * (stats.dashMul ?? 1);
            this.invuln = Math.max(this.invuln, PLAYER.dash.iframes);
            Audio.play('dash');
            EventBus.emit(EV.PLAYER_DASH, this.x, this.y);
            this.scene.fx.dust(this.x, this.y + 10);
        }

        if (this.dashT > 0) {
            this.dashT -= dt;
            const v = this.speed * PLAYER.dash.speedMul;
            this.body.setVelocity(this.dashDirX * v, this.dashDirY * v);
            // after-images
            this.animTick += dt;
            if (this.animTick > 0.03) {
                this.animTick = 0;
                this.scene.fx.ghost(this.x, this.y, this.facing);
            }
        } else {
            const v = this.speed;
            this.body.setVelocity(ix * v, iy * v);
        }

        if (ix < -0.05) { this.facing = -1; }
        else if (ix > 0.05) { this.facing = 1; }
        this.setFlipX(this.facing < 0);

        // animation
        if (this.dashT > 0) { this.play('hero_dash', true); }
        else if (this.hurtCd > PLAYER.hurtCooldown - 0.12) { this.play('hero_hurt', true); }
        else if (this.moving) { this.play('hero_walk', true); }
        else { this.play('hero_idle', true); }

        // i-frame blink
        this.setAlpha(this.invuln > 0 && this.dashT <= 0 ? (Math.floor(this.invuln * 18) % 2 ? 0.45 : 0.95) : 1);

        // dash cooldown ring
        this.dashRing.clear();
        this.dashRing.setPosition(0, 0);
        const cdMax = 2.4 * (stats.dashMul ?? 1);
        if (this.dashCd > 0) {
            const t = 1 - this.dashCd / cdMax;
            this.dashRing.lineStyle(1.5, 0x63d8f0, 0.55);
            this.dashRing.beginPath();
            this.dashRing.arc(this.x, this.y + 2, 15, -1.5708, -1.5708 + t * 6.283);
            this.dashRing.strokePath();
        } else {
            this.dashRing.lineStyle(1, 0x63d8f0, 0.28);
            this.dashRing.beginPath();
            this.dashRing.arc(this.x, this.y + 2, 15, 0, 6.283);
            this.dashRing.strokePath();
        }
        this.dashRing.setDepth(2001 + this.y);

        // rig follow
        this.shadow.setPosition(this.x, this.y + 12);
        this.shadow.setScale(1 + (this.dashT > 0 ? 0.2 : 0));
        const flick = 1 + Math.sin(this.scene.time.now * 0.013) * 0.05 + Math.sin(this.scene.time.now * 0.037) * 0.03;
        this.glow.setPosition(this.x + 6 * this.facing, this.y + 2);
        this.glow.setScale(4.1 * flick + stats.area * 0.35);
        this.coreGlow.setPosition(this.x + 7 * this.facing, this.y + 5);
        this.coreGlow.setScale(1.5 * flick);
    }

    hurt(amount, fromX, fromY) {
        if (this.invuln > 0 || this.hurtCd > 0 || this.dead || this.scene.godMode) { return false; }
        this.hp -= amount;
        this.hurtCd = PLAYER.hurtCooldown;
        this.invuln = PLAYER.iframes;
        // knock away from source
        const dx = this.x - fromX, dy = this.y - fromY;
        const d = Math.hypot(dx, dy) || 1;
        this.body.setVelocity((dx / d) * 180, (dy / d) * 180);
        Audio.play('hurt');
        EventBus.emit(EV.PLAYER_HIT, amount);
        this.scene.fx.bloodBurst(this.x, this.y);
        this.scene.fx.hitDir(this.x, this.y, fromX, fromY);
        this.scene.fx.shake(4, 120);
        if (this.hp <= 0) {
            this.hp = 0;
            EventBus.emit(EV.PLAYER_DIED);
        }
        return true;
    }

    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        if (this.hp > before) {
            EventBus.emit(EV.PLAYER_HEAL, this.hp - before);
            this.scene.fx.heal(this.x, this.y - 10);
        }
    }

    destroy(fromScene) {
        this.dashRing?.destroy();
        this.shadow?.destroy();
        this.glow?.destroy();
        this.coreGlow?.destroy();
        super.destroy(fromScene);
    }
}

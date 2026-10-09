import { PICKUP } from '../data/game.js';
import { EventBus, EV } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

/**
 * Drops, magnets, chests and the pickup pool.
 */
export class LootSystem {
    constructor(scene) {
        this.scene = scene;
        this.pickups = [];
        this.pool = [];
        this.gold = 0;
    }

    obtain(frame) {
        let s = this.pool.pop();
        if (!s) {
            s = this.scene.add.sprite(0, 0, 'atlas', frame);
            this.scene.physics.add.existing(s);
            s.body.setAllowGravity(false);
        } else {
            s.setFrame(frame);
            s.setActive(true).setVisible(true);
            if (s.body) { s.body.enable = true; }
        }
        if (s.body) { s.body.setVelocity(0, 0); }
        return s;
    }

    release(s, i) {
        s.setActive(false).setVisible(false);
        if (s.body) { s.body.enable = false; }
        this.pickups.splice(i, 1);
        this.pool.push(s);
    }

    add(kind, x, y, value = 0) {
        if (this.pickups.length > 240 && kind.startsWith('ember')) { return null; }
        const cfg = PICKUP[kind];
        const s = this.obtain(`${cfg.sprite}_0`);
        if (this.scene.anims.exists(cfg.sprite)) { s.play(cfg.sprite); }
        s.setPosition(x, y);
        s.setDepth(1600);
        s.body.setVelocity((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
        s.body.setDamping(true).setDrag(0.92);
        const p = { sprite: s, kind, value, t: Math.random() * 6, magnetT: 0 };
        this.pickups.push(p);
        return p;
    }

    dropEmber(x, y, sizeIdx = 0) {
        const kind = ['emberS', 'emberM', 'emberL'][Math.min(2, sizeIdx)];
        return this.add(kind, x, y);
    }

    dropChest(x, y, boss = false) {
        const p = this.add('chest', x, y, boss ? 1 : 0);
        p.sprite.setScale(boss ? 1.3 : 1);
        return p;
    }

    rollDrop(enemy) {
        const scene = this.scene;
        const luck = scene.playerStats.luck;
        // experience
        const xp = enemy.xp;
        if (xp >= 20) { this.dropEmber(enemy.x, enemy.y, 2); }
        else if (xp >= 5) { this.dropEmber(enemy.x, enemy.y, 1); }
        else {
            const n = Math.max(1, Math.round(xp));
            this.dropEmber(enemy.x, enemy.y, 0);
            for (let i = 1; i < n; i++) {
                this.dropEmber(enemy.x + (Math.random() - 0.5) * 24, enemy.y + (Math.random() - 0.5) * 24, 0);
            }
        }
        // gold coins
        if (Math.random() < enemy.gold + luck * 0.01) {
            this.add('coin', enemy.x + (Math.random() - 0.5) * 16, enemy.y + (Math.random() - 0.5) * 16, 1 + Math.floor(Math.random() * 3));
        }
        // consumables
        const r = Math.random();
        if (r < 0.012 + luck * 0.004) { this.add('flask', enemy.x, enemy.y); }
        else if (r < 0.016 + luck * 0.003) { this.add('magnet', enemy.x, enemy.y); }
        else if (r < 0.020 + luck * 0.003) { this.add('bomb', enemy.x, enemy.y); }
        // elite chest
        if (enemy.elite && Math.random() < 0.25 + luck * 0.1) { this.dropChest(enemy.x, enemy.y, false); }
    }

    collect(p, i, game) {
        const player = game.player;
        switch (p.kind) {
            case 'emberS': case 'emberM': case 'emberL': {
                const xp = Math.round(PICKUP[p.kind].xp * (1 + playerStatsGreed(game)));
                game.addXp(xp);
                game.dmg.show(`+${xp}`, p.sprite.x, p.sprite.y - 8, 'xp');
                Audio.play('xp', xp);
                break;
            }
            case 'coin': {
                const g = Math.round(p.value * (1 + playerStatsGreed(game)) * (1 + game.playerStats.goldMul));
                this.gold += g;
                EventBus.emit(EV.GOLD_GAINED, g);
                game.dmg.show(`+${g}`, p.sprite.x, p.sprite.y - 8, 'gold');
                Audio.play('gold');
                break;
            }
            case 'flask': {
                player.heal(30);
                Audio.play('heal');
                break;
            }
            case 'magnet': {
                for (const q of this.pickups) { q.magnetT = 3; }
                Audio.play('upgrade');
                game.banner('МАГНИТ', 0x8ee6ff);
                break;
            }
            case 'bomb': {
                Audio.play('explode');
                game.fx.shake(8, 300);
                game.fx.flash(255, 200, 140, 0.35, 160);
                for (const e of game.enemies) {
                    if (!e.dead) {
                        game.fx.explosion(e.x, e.y, 0.5);
                        const cap = e.boss ? e.maxHp * 0.12 : e.elite ? e.maxHp * 0.45 : 99999;
                        e.damage(cap, { silent: true, source: 'bomb' });
                    }
                }
                game.clearEnemyBullets();
                game.banner('БОМБА!', 0xffb347);
                break;
            }
            case 'chest': {
                game.openChest(p.value === 1);
                Audio.play('chest');
                break;
            }
        }
        EventBus.emit(EV.PICKUP, p.kind);
        this.release(p.sprite, i);
    }

    update(dt, game) {
        const player = game.player;
        const pr = game.playerStats.pickup;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            const s = p.sprite;
            p.t += dt;
            p.magnetT = Math.max(0, p.magnetT - dt);
            const dx = player.x - s.x, dy = player.y - s.y;
            const d = Math.hypot(dx, dy) || 1;
            const attract = d < pr || p.magnetT > 0 || p.kind === 'chest' && d < pr * 0.8;
            if (attract) {
                const sp = p.magnetT > 0 ? 520 : 300 + (1 - d / pr) * 260;
                s.body.setVelocity((dx / d) * sp, (dy / d) * sp);
            }
            // gentle bob for gems
            if (p.kind.startsWith('ember')) {
                s.setScale(1 + Math.sin(p.t * 6) * 0.08);
            }
            if (d < 14) { this.collect(p, i, game); }
        }
    }

    destroy() {
        this.pickups.slice().forEach((p, i) => this.release(p.sprite, i));
        this.pool.forEach(s => s.destroy());
    }
}

function playerStatsGreed(game) { return game.playerStats.greed; }

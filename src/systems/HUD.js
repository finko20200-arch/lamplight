import { WEAPONS, PASSIVES } from '../data/game.js';

const VW = 640, VH = 360;

const F_NUM = { fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#f6ead2', stroke: '#08060d', strokeThickness: 3 };
const F_BIG = { fontFamily: '"Press Start 2P", monospace', fontSize: '14px', color: '#ffd98a', stroke: '#08060d', strokeThickness: 4 };
const F_TXT = { fontFamily: '"Pixelify Sans", monospace', fontSize: '14px', color: '#f2e6c8', stroke: '#08060d', strokeThickness: 3 };
const F_BANNER = { fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#ffd98a', stroke: '#08060d', strokeThickness: 5 };

/**
 * In-game HUD: XP bar, timer, HP, counters, weapon/passive trays,
 * boss bar and event banners. All scrollFactor 0.
 */
export class HUD {
    constructor(scene) {
        this.scene = scene;
        this.g = scene.add.graphics().setDepth(20000).setScrollFactor(0);

        // XP bar frame pieces
        
        this.timer = scene.add.text(VW / 2, 16, '00:00', F_BIG).setOrigin(0.5).setDepth(20002).setScrollFactor(0);

        this.hpIcon = scene.add.image(14, 24, 'atlas', 'ic_heart').setScale(0.72).setDepth(20002).setScrollFactor(0);
        this.hpText = scene.add.text(182, 23, '100/100', F_NUM).setOrigin(0, 0.5).setDepth(20002).setScrollFactor(0);

        this.lvlText = scene.add.text(6, 40, 'УР 1', F_NUM).setDepth(20002).setScrollFactor(0);
        this.waveText = scene.add.text(VW / 2, 34, 'ВОЛНА 1/12', { ...F_NUM, fontSize: '8px', color: '#cbbfe0' }).setOrigin(0.5).setDepth(20002).setScrollFactor(0);

        this.killIcon = scene.add.image(VW - 96, 22, 'atlas', 'ic_skull').setScale(0.6).setDepth(20002).setScrollFactor(0);
        this.killText = scene.add.text(VW - 84, 22, '0', F_NUM).setOrigin(0, 0.5).setDepth(20002).setScrollFactor(0);
        this.goldIcon = scene.add.image(VW - 96, 38, 'atlas', 'ic_gold').setScale(0.6).setDepth(20002).setScrollFactor(0);
        this.goldText = scene.add.text(VW - 84, 38, '0', F_NUM).setOrigin(0, 0.5).setDepth(20002).setScrollFactor(0);

        this.pauseBtn = scene.add.image(VW - 16, 16, 'atlas', 'ic_pause').setScale(0.62).setDepth(20003).setScrollFactor(0)
            .setInteractive({ useHandCursor: true }).setAlpha(0.85);

        // weapon & passive trays
        this.weaponIcons = [];
        this.passiveIcons = [];
        this.dashIcon = scene.add.image(16, VH - 16, 'atlas', 'ic_dash').setScale(0.62).setDepth(20002).setScrollFactor(0).setAlpha(0.4);

        // boss bar
        this.bossName = scene.add.text(VW / 2, VH - 34, '', { ...F_NUM, color: '#d9a7ff', fontSize: '8px' }).setOrigin(0.5).setDepth(20002).setScrollFactor(0).setVisible(false);
        this.bossVisible = false;

        // banner
        this.bannerText = scene.add.text(VW / 2, 108, '', F_BANNER).setOrigin(0.5).setDepth(20004).setScrollFactor(0).setAlpha(0);

        // starting control hint
        this.hint = scene.add.text(VW / 2, VH - 64, 'WASD / СТРЕЛКИ — движение · SPACE — рывок', F_TXT)
            .setOrigin(0.5).setDepth(20002).setScrollFactor(0).setAlpha(0);
        scene.tweens.add({ targets: this.hint, alpha: 0.9, duration: 600, delay: 1200 });
        scene.tweens.add({ targets: this.hint, alpha: 0, duration: 900, delay: 9000 });
    }

    setWeaponTray(keys) {
        this.weaponIcons.forEach(w => { w.cont.destroy(); w.zone.destroy(); });
        if (this.tip) { this.tip.destroy(); this.tip = null; }
        this.weaponIcons = [];
        keys.forEach((k, idx) => {
            const cont = this.scene.add.container(24 + idx * 26, VH - 40).setDepth(20002).setScrollFactor(0);
            const img = this.scene.add.image(0, 0, 'atlas', WEAPONS[k].icon).setScale(0.95);
            const pips = this.scene.add.graphics();
            cont.add([img, pips]);
            const zone = this.scene.add.zone(24 + idx * 26, VH - 40, 24, 24)
                .setInteractive({ useHandCursor: true }).setDepth(20004).setScrollFactor(0);
            zone.on('pointerover', () => this.showTip(24 + idx * 26, k));
            zone.on('pointerout', () => this.hideTip());
            this.weaponIcons.push({ cont, pips, key: k, idx, zone });
        });
    }

    showTip(x, key) {
        const g = this.scene.weapons ? this.scene : this.scene.scene.get('Game');
        const lvl = g && g.weapons ? (g.weapons.get(key)?.level || 1) : 1;
        const def = WEAPONS[key];
        if (!this.tip) {
            this.tip = this.scene.add.text(0, 0, '', { ...F_TXT, fontSize: '12px' })
                .setOrigin(0.5, 1).setDepth(20005).setScrollFactor(0);
        }
        this.tip.setText(`${def.name} · ур. ${lvl}/${def.max}`);
        this.tip.setPosition(Phaser.Math.Clamp(x, 90, VW - 90), VH - 56).setVisible(true);
    }

    hideTip() { if (this.tip) { this.tip.setVisible(false); } }

    refreshWeaponPips(game) {
        for (const w of this.weaponIcons) {
            const lvl = game.weapons.get(w.key)?.level || 1;
            const max = WEAPONS[w.key].max;
            w.pips.clear();
            for (let i = 0; i < max; i++) {
                const x = -((max - 1) * 3) / 2 + i * 3;
                w.pips.fillStyle(i < lvl ? 0xffd75e : 0x352b52, 1);
                w.pips.fillRect(x - 1, 12, 2, 2);
            }
        }
    }

    setPassiveTray(entries) {
        this.passiveIcons.forEach(i => i.destroy());
        this.passiveIcons = [];
        entries.forEach(([key, lvl], idx) => {
            const cont = this.scene.add.container(VW - 20 - (idx % 6) * 20, VH - 18 - Math.floor(idx / 6) * 20).setDepth(20002).setScrollFactor(0);
            const img = this.scene.add.image(0, 0, 'atlas', PASSIVES[key].icon).setScale(0.72);
            const lbl = this.scene.add.text(8, 4, String(lvl), { ...F_NUM, fontSize: '7px', strokeThickness: 2 }).setOrigin(0, 0.5);
            cont.add([img, lbl]);
            this.passiveIcons.push(cont);
        });
    }

    banner(text, color = 0xffd98a) {
        this.bannerText.setText(text);
        this.bannerText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
        this.scene.tweens.killTweensOf(this.bannerText);
        this.bannerText.setAlpha(0).setScale(0.8);
        this.scene.tweens.add({
            targets: this.bannerText, alpha: 1, scale: 1, duration: 260, ease: 'Back.Out',
            onComplete: () => {
                this.scene.tweens.add({ targets: this.bannerText, alpha: 0, delay: 1400, duration: 500 });
            }
        });
    }

    setBoss(name) {
        this.bossName.setText(name).setVisible(true);
        this.bossVisible = true;
    }

    hideBoss() { this.bossVisible = false; this.bossName.setVisible(false); }

    update(dt, game) {
        const g = this.g;
        const p = game.player;
        g.clear();

        // weapon tray plates (graphics: renderer-agnostic, unlike tinted quads)
        for (const w of this.weaponIcons) {
            const x = 24 + w.idx * 26, y = VH - 40;
            g.fillStyle(0x0d0a16, 0.92); g.fillRect(x - 12, y - 12, 24, 24);
            g.fillStyle(0x4a3d6b, 1);
            g.fillRect(x - 12, y - 12, 24, 1); g.fillRect(x - 12, y + 11, 24, 1);
            g.fillRect(x - 12, y - 12, 1, 24); g.fillRect(x + 11, y - 12, 1, 24);
        }

        // ── XP bar
        g.fillStyle(0x0d0a16, 0.95); g.fillRect(4, 4, VW - 8, 7);
        g.fillStyle(0x10233a, 1); g.fillRect(5, 5, VW - 10, 5);
        const xpT = game.xpCur / Math.max(1, game.xpNext);
        g.fillStyle(0x2f9fd8, 1); g.fillRect(5, 5, Math.round((VW - 10) * xpT), 5);
        g.fillStyle(0x8ee6ff, 0.9); g.fillRect(5, 5, Math.round((VW - 10) * xpT), 2);
        // level pips every 5 levels
        g.fillStyle(0x0d0a16, 0.8);
        for (let L = 5; L < 40; L += 5) {
            const px = 5 + Math.round((VW - 10) * Math.min(1, L / 40));
            g.fillRect(px, 5, 1, 5);
        }
        // level-up flash
        if (this.__lvl !== undefined && game.level > this.__lvl) { this.__flash = 0.35; }
        this.__lvl = game.level;
        if (this.__flash > 0) {
            this.__flash -= dt;
            g.fillStyle(0xffffff, Math.min(0.8, this.__flash * 2.4));
            g.fillRect(5, 5, VW - 10, 5);
        }
        g.lineStyle(1, 0x4a3d6b, 1); g.strokeRect(4.5, 4.5, VW - 9, 6);

        // ── HP bar
        const hpW = 150;
        g.fillStyle(0x0d0a16, 0.9); g.fillRect(26, 18, hpW, 10);
        g.fillStyle(0x6b0f22, 1); g.fillRect(27, 19, hpW - 2, 8);
        const hpT = Math.max(0, p.hp / p.maxHp);
        g.fillStyle(0xc8203c, 1); g.fillRect(27, 19, Math.round((hpW - 2) * hpT), 8);
        g.fillStyle(0xff4d63, 0.85); g.fillRect(27, 19, Math.round((hpW - 2) * hpT), 3);
        for (let i = 1; i < 5; i++) { g.fillStyle(0x0d0a16, 0.7); g.fillRect(27 + (hpW - 2) * i / 5, 19, 1, 8); }
        g.lineStyle(1, 0x4a3d6b, 1); g.strokeRect(26.5, 18.5, hpW - 1, 9);

        // ── boss bar
        if (this.bossVisible && (!game.boss || game.boss.dead)) { this.hideBoss(); }
        if (this.bossVisible && game.boss && !game.boss.dead) {
            const bw = 380;
            g.fillStyle(0x0d0a16, 0.92); g.fillRect(VW / 2 - bw / 2, VH - 26, bw, 9);
            g.fillStyle(0x3a1a63, 1); g.fillRect(VW / 2 - bw / 2 + 1, VH - 25, bw - 2, 7);
            const bt = Math.max(0, game.boss.hp / game.boss.maxHp);
            g.fillStyle(0x6b2fb3, 1); g.fillRect(VW / 2 - bw / 2 + 1, VH - 25, Math.round((bw - 2) * bt), 7);
            g.fillStyle(0xa45cff, 0.9); g.fillRect(VW / 2 - bw / 2 + 1, VH - 25, Math.round((bw - 2) * bt), 2);
            g.lineStyle(1, 0x6d5c96, 1); g.strokeRect(VW / 2 - bw / 2 + 0.5, VH - 26.5, bw - 1, 10);
        }

        // ── low hp warning vignette
        const hpT2 = Math.max(0, p.hp / p.maxHp);
        if (hpT2 < 0.3 && !game.over) {
            const pulse = 0.22 + Math.sin(game.time.now * 0.012) * 0.12;
            g.lineStyle(4, 0xd1233f, pulse);
            g.strokeRect(3, 3, VW - 6, VH - 6);
            g.lineStyle(2, 0xff5470, pulse * 0.8);
            g.strokeRect(6, 6, VW - 12, VH - 12);
        }

        // ── boss off-screen arrow
        const boss = game.boss;
        if (boss && !boss.dead) {
            const cam = game.cameras.main;
            const sx = boss.x - cam.scrollX, sy = boss.y - cam.scrollY;
            const m = 26;
            if (sx < -m || sx > VW + m || sy < -m || sy > VH + m) {
                const cx = Phaser.Math.Clamp(sx, m, VW - m);
                const cy = Phaser.Math.Clamp(sy, m, VH - m);
                const a = Math.atan2(sy - cy, sx - cx);
                const x1 = cx + Math.cos(a) * 10, y1 = cy + Math.sin(a) * 10;
                const x2 = cx + Math.cos(a + 2.5) * 8, y2 = cy + Math.sin(a + 2.5) * 8;
                const x3 = cx + Math.cos(a - 2.5) * 8, y3 = cy + Math.sin(a - 2.5) * 8;
                g.fillStyle(0xd9a7ff, 0.85);
                g.fillTriangle(x1, y1, x2, y2, x3, y3);
            }
        }

        // ── dash cooldown
        const dashT = p.dashCd / 2.4;
        this.dashIcon.setAlpha(dashT <= 0 ? 0.95 : 0.35);
        if (dashT > 0) {
            g.fillStyle(0x63d8f0, 0.8);
            g.fillRect(8, VH - 8, Math.round(16 * (1 - dashT)), 2);
        }

        // texts
        this.hpText.setText(`${Math.ceil(p.hp)}/${Math.round(p.maxHp)}`);
        const d = game.director;
        if (d) {
            if (d.state === 'breather') {
                const left = Math.ceil(Math.max(0, d.stateT));
                this.waveText.setText(d.wave < 0 ? `ПОДГОТОВКА… ${left}` : `ПЕРЕДЫШКА · ВОЛНА ${d.waveNumber + 1} ЧЕРЕЗ ${left}`);
            } else if (d.graceT > 0) {
                this.waveText.setText(`ВОЛНА ${d.waveNumber}/${d.totalWaves} · ЧЕРЕЗ ${Math.ceil(d.graceT)}`);
            } else {
                this.waveText.setText(`ВОЛНА ${d.waveNumber}/${d.totalWaves} · ВРАГОВ: ${d.waveAlive + Math.max(0, d.budgetLeft | 0)}`);
            }
        }
        this.lvlText.setText(`УР ${game.level}`);
        this.killText.setText(String(game.kills));
        this.goldText.setText(String(game.loot.gold));
        const t = Math.floor(game.runTime);
        this.timer.setText(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
        if (game.runTime > 540) { this.timer.setColor('#ff8a2b'); }
    }

    destroy() {
        this.g.destroy();
        [this.timer, this.hpIcon, this.hpText, this.lvlText, this.waveText, this.killIcon, this.killText,
            this.goldIcon, this.goldText, this.pauseBtn, this.dashIcon, this.bossName,
            this.bannerText, this.hint].forEach(o => o.destroy());
        this.weaponIcons.forEach(w => { w.cont.destroy(); w.zone.destroy(); });
        if (this.tip) { this.tip.destroy(); this.tip = null; }
        this.passiveIcons.forEach(o => o.destroy());
    }
}

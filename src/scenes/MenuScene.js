import { makeButton, drawPanel, FONTS } from '../ui/widgets.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';
import { Platform } from '../core/Platform.js';

const VW = 640, VH = 360;

/**
 * Title screen: a living diorama, not a static list.
 * Layers (back → front): ground scroll → distant silhouette forest → mid props
 * with real lantern light → Hollow King silhouette with pulsing eyes →
 * drifting fog → embers → hero diorama with flickering light pool → UI.
 */
export class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
        Audio.init();
        Audio.setMusic(Save.get('music', true));
        Audio.setSfx(Save.get('sfx', true));
        Audio.setIntensity(1);

        this.t = 0;

        /* ── layer 0: ground ── */
        this.ground = this.add.tileSprite(VW / 2, VH / 2, VW, VH, 'ground').setDepth(0);

        /* ── layer 1: distant silhouette forest (parallax drift) ── */
        this.far = [];
        for (let i = 0; i < 9; i++) {
            const k = i % 2 ? 'pine' : 'tree_dead';
            const s = this.add.image(40 + i * 74 + (i % 3) * 18, 60 + (i % 4) * 22, 'atlas', k + '_0')
                .setDepth(1).setScale(1.7 + (i % 3) * 0.3).setAlpha(0.34)
                .setTint(0x141024);
            this.far.push(s);
        }

        /* ── layer 2: mid props with living light ── */
        this.midLights = [];
        const mid = [
            ['lantern_post', 96, 150], ['grave', 210, 120], ['mushrooms', 300, 96],
            ['pine', 560, 120], ['lantern_post', 596, 210], ['bones', 420, 92],
            ['stump', 150, 320], ['crystal', 606, 320], ['bush', 40, 300]
        ];
        this.mid = mid.map(([k, x, y], i) => {
            const s = this.add.sprite(x, y, 'atlas', k + '_0').setDepth(2 + i * 0.01).setScale(1.05);
            if (this.anims.exists(k)) { s.play(k); }
            if (k === 'lantern_post' || k === 'crystal' || k === 'mushrooms') {
                const tint = k === 'lantern_post' ? 0xff8a2b : k === 'crystal' ? 0xa45cff : 0x2f8fa8;
                const l = this.add.image(x + (k === 'lantern_post' ? 5 : 0), y - (k === 'lantern_post' ? 26 : 8), 'atlas', 'soft_glow')
                    .setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setTint(tint)
                    .setScale(k === 'lantern_post' ? 3.2 : 2.2).setAlpha(0.3);
                this.midLights.push(l);
            }
            return s;
        });

        /* ── layer 3: the Hollow King silhouette, watching ── */
        this.king = this.add.image(508, 196, 'atlas', 'boss_0').setDepth(3)
            .setScale(1.9).setAlpha(0.5).setTint(0x1a1030);
        this.kingEyes = [0, 1].map(i => this.add.image(508 + (i ? 7 : -7), 168, 'atlas', 'soft_glow')
            .setDepth(4).setBlendMode(Phaser.BlendModes.ADD).setTint(0xa45cff)
            .setScale(0.5).setAlpha(0.8));
        this.kingAura = this.add.image(508, 200, 'atlas', 'soft_glow').setDepth(3)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0x6b2fb3).setScale(7).setAlpha(0.12);

        /* ── layer 4: fog + embers + wandering wisps ── */
        this.fogs = [];
        for (let i = 0; i < 6; i++) {
            const f = this.add.sprite(Math.random() * VW, Math.random() * VH, 'atlas', 'fog_puff_0')
                .setDepth(7).setAlpha(0.08 + Math.random() * 0.06)
                .setBlendMode(Phaser.BlendModes.SCREEN).setScale(2.4 + Math.random() * 2).setTint(0x3a3350);
            f.play('fog_puff');
            f.__v = 5 + Math.random() * 9;
            this.fogs.push(f);
        }
        this.embers = this.add.particles(VW / 2, VH, 'atlas', {
            frame: ['mote_amber_0', 'mote_amber_1'],
            x: { min: 0, max: VW }, y: VH + 10,
            speedY: { min: -34, max: -12 }, speedX: { min: -9, max: 9 },
            lifespan: { min: 4000, max: 8000 }, scale: { start: 1.2, end: 0 },
            frequency: 240, blendMode: 'ADD', alpha: 0.8
        }).setDepth(8);
        this.wispTimer = this.time.addEvent({
            delay: 5200, loop: true,
            callback: () => {
                const y = 60 + Math.random() * 200;
                const w = this.add.sprite(-20, y, 'atlas', 'wisp_0').setDepth(8)
                    .setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
                w.play('wisp');
                this.tweens.add({
                    targets: w, x: VW + 30, y: y + (Math.random() - 0.5) * 90,
                    duration: 9000 + Math.random() * 4000, ease: 'Sine.inOut',
                    onComplete: () => w.destroy()
                });
            }
        });

        /* ── layer 5: hero diorama ── */
        this.heroLight = this.add.image(104, 246, 'atlas', 'soft_glow').setDepth(9)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa040).setScale(4.6).setAlpha(0.38);
        this.heroShadow = this.add.image(104, 268, 'atlas', 'shadow').setDepth(9).setAlpha(0.7).setScale(1.8);
        this.hero = this.add.sprite(104, 246, 'atlas', 'hero_idle_0').setDepth(10).setScale(2);
        this.hero.play('hero_idle');

        /* ── darkness wash for depth ── */
        this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x0a0716, 0.35).setDepth(11);

        /* ── UI ── */
        this.titleGlow = this.add.text(VW / 2 + 2, 62, 'LAMPLIGHT', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '32px', color: '#ff8a2b'
        }).setOrigin(0.5).setDepth(12).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
        this.title = this.add.text(VW / 2, 60, 'LAMPLIGHT', { ...FONTS.title, fontSize: '32px' }).setOrigin(0.5).setDepth(13);
        this.add.text(VW / 2, 88, 'ПОСЛЕДНЯЯ ВАХТА', { ...FONTS.h2, color: '#8ee6ff' }).setOrigin(0.5).setDepth(13);
        this.add.text(VW / 2, 106, '2D-SURVIVOR · PHASER 4', FONTS.small).setOrigin(0.5).setDepth(13);
        this.goal = this.add.text(VW / 2, 122, 'ЦЕЛЬ: 12 ВОЛН ТЬМЫ И ГИБЕЛЬ КОРОЛЯ', { ...FONTS.small, color: '#ffd98a' })
            .setOrigin(0.5).setDepth(13);

        const bx = 322;
        this.btns = [];
        this.btns.push(makeButton(this, bx, 156, 210, 28, 'ИГРАТЬ', () => this.start(false), { icon: 'ic_play', fontSize: 11 }));
        const unl = Save.data.flags.endlessUnlocked;
        this.btns.push(makeButton(this, bx, 188, 210, 24, unl ? 'БЕСКОНЕЧНЫЙ' : 'БЕСКОНЕЧНЫЙ (ЗАКРЫТ)', () => {
            if (!Save.data.flags.endlessUnlocked) { Audio.play('deny'); this.hint('ОТКРОЕТСЯ ПОСЛЕ ПЕРВОЙ ПОБЕДЫ'); return; }
            this.start(true);
        }, { icon: unl ? 'ic_star' : 'ic_lock', fontSize: 8 }));
        this.btns.push(makeButton(this, bx, 216, 210, 24, 'АЛТАРЬ', () => { Audio.play('ui'); this.scene.launch('Altar'); }, { icon: 'ic_crown', fontSize: 9 }));
        this.btns.push(makeButton(this, bx, 244, 210, 24, 'НАСТРОЙКИ', () => { Audio.play('ui'); this.scene.launch('Settings'); }, { icon: 'ic_gear', fontSize: 9 }));
        this.btns.push(makeButton(this, bx, 272, 210, 24, 'КАК ИГРАТЬ', () => { Audio.play('ui'); this.toggleHelp(); }, { icon: 'ic_tome', fontSize: 9 }));

        /* stats plate */
        const s = Save.data.stats;
        const pg = this.add.graphics().setDepth(12);
        drawPanel(pg, 36, 292, 200, 52, { fill: 0x120e1e, alpha: 0.85 });
        this.add.text(46, 302, `ЗАБЕГОВ ${s.runs} · ПОБЕД ${s.wins}`, { ...FONTS.small, fontSize: '10px' }).setDepth(13);
        this.add.text(46, 316, `РЕКОРД ${fmt(s.bestTime)} · УБИЙСТВ ${s.totalKills}`, { ...FONTS.small, fontSize: '10px' }).setDepth(13);
        this.add.text(46, 330, `ЗОЛОТО: ${Save.data.gold}`, { ...FONTS.small, fontSize: '10px', color: '#ffc93c' }).setDepth(13);

        this.add.text(VW - 8, VH - 8, 'v1.2', { ...FONTS.small, fontSize: '9px', color: '#6d5c96' }).setOrigin(1, 1).setDepth(13);

        this.hintTxt = this.add.text(VW / 2, 344, '', { ...FONTS.small, color: '#ff5470' }).setOrigin(0.5).setDepth(31001).setAlpha(0);

        this.input.keyboard.on('keydown-ENTER', () => this.start(false));
        if (location.search.includes('altar')) { this.scene.launch('Altar'); }
    }

    hint(t) {
        this.hintTxt.setText(t);
        this.tweens.killTweensOf(this.hintTxt);
        this.tweens.add({ targets: this.hintTxt, alpha: 1, duration: 120, onComplete: () => {
            this.tweens.add({ targets: this.hintTxt, alpha: 0, delay: 1500, duration: 400 });
        } });
    }

    /* ── help panel ── */
    toggleHelp(silent) {
        if (this.help) { this.help.forEach(o => o.destroy()); this.help = null; if (silent) { return; } return; }
        if (silent) { return; }
        const h = [];
        const g = this.add.graphics().setDepth(31000);
        drawPanel(g, VW / 2 - 210, 60, 420, 240, { fill: 0x171226, alpha: 0.97 });
        h.push(g);
        h.push(this.add.text(VW / 2, 78, 'КАК ИГРАТЬ', { ...FONTS.h2, color: '#8ee6ff' }).setOrigin(0.5).setDepth(31001));
        const lines = [
            ['WASD / СТРЕЛКИ', 'движение'],
            ['SPACE / SHIFT', 'рывок с неуязвимостью'],
            ['ОРУЖИЕ', 'стреляет само — держи дистанцию'],
            ['УРОВНИ', 'выбирай дары: 1-5 или клик'],
            ['ВОЛНЫ', '12 волн, между ними передышка и награды'],
            ['БОССЫ', 'волны 7 и 12 — Полый Король'],
            ['АЛТАРЬ', 'золото забегов = вечные улучшения'],
            ['ESC', 'пауза и настройки']
        ];
        lines.forEach(([a, b], i) => {
            h.push(this.add.text(VW / 2 - 190, 98 + i * 24, a, { ...FONTS.num, color: '#ffd98a', fontSize: '8px' }).setDepth(31001));
            h.push(this.add.text(VW / 2 - 60, 98 + i * 24, b, { ...FONTS.body, fontSize: '13px' }).setDepth(31001));
        });
        const close = this.add.text(VW / 2, 288, 'ЗАКРЫТЬ', { ...FONTS.small, color: '#8ee6ff' }).setOrigin(0.5).setDepth(31001)
            .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleHelp());
        h.push(close);
        this.help = h;
    }

    start(endless) {
        Audio.play('upgrade');
        this.cameras.main.fadeOut(400, 8, 6, 13);
        this.time.delayedCall(420, () => this.scene.start('Game', { endless: !!endless }));
    }

    update(t, dt) {
        this.t += dt / 1000;
        Audio.schedule();
        const k = this.t;
        this.ground.tilePositionY -= 0.08;
        for (let i = 0; i < this.far.length; i++) {
            this.far[i].x -= (0.06 + (i % 3) * 0.03) * (dt / 16);
            if (this.far[i].x < -60) { this.far[i].x = VW + 60; }
        }
        for (const f of this.fogs) {
            f.x += f.__v * (dt / 1000);
            if (f.x > VW + 90) { f.x = -90; }
        }
        for (let i = 0; i < this.midLights.length; i++) {
            const l = this.midLights[i];
            l.setAlpha(l.alpha * 0 + (0.26 + Math.sin(k * 6 + i * 2.2) * 0.06 + Math.sin(k * 13 + i) * 0.03));
        }
        this.heroLight.setScale(4.6 + Math.sin(k * 7) * 0.25 + Math.sin(k * 17) * 0.12);
        this.titleGlow.setAlpha(0.42 + Math.sin(k * 2.2) * 0.14);
        this.kingAura.setAlpha(0.1 + Math.sin(k * 1.3) * 0.04);
        const blink = (Math.sin(k * 0.9) > 0.96) ? 0.15 : 0.8;
        this.kingEyes.forEach(e => e.setAlpha(blink + Math.sin(k * 9) * 0.08));
        this.king.y = 196 + Math.sin(k * 0.8) * 3;
    }
}

function fmt(sec) {
    sec = Math.floor(sec || 0);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

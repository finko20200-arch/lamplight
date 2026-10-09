import { drawPanel, makeButton, FONTS } from '../ui/widgets.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';
import { Taps } from '../ui/tap.js';

const VW = 640, VH = 360;

export class PauseScene extends Phaser.Scene {
    constructor() { super('Pause'); }

    create() {
        this.taps = new Taps(this);
        this.dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x06040c, 0.72).setDepth(30000);
        const g = this.add.graphics().setDepth(30001);
        drawPanel(g, VW / 2 - 150, 60, 300, 262, { fill: 0x171226, alpha: 0.97 });
        this.add.text(VW / 2, 84, 'ПАУЗА', { ...FONTS.h2 }).setOrigin(0.5).setDepth(30002);

        const game = this.scene.get('Game');
        this.add.text(VW / 2, 108,
            `ВРЕМЯ ${fmt(game.runTime)} · УБИЙСТВ ${game.kills} · УР ${game.level}`,
            FONTS.small).setOrigin(0.5).setDepth(30002);

        makeButton(this, VW / 2, 138, 200, 26, 'ПРОДОЛЖИТЬ', () => this.resume(), { icon: 'ic_play', fontSize: 10, depth: 30002 });
        this.taps.add(VW / 2, 138, 200, 26, () => this.resume());
        this.children.list.forEach(c => { if (c.type === 'Zone') { c.disableInteractive(); } });

        // toggles
        const row = (y, label, get, set) => {
            const t = this.add.text(VW / 2 - 80, y, label, FONTS.body).setOrigin(0, 0.5).setDepth(30002);
            const v = this.add.text(VW / 2 + 90, y, '', { ...FONTS.num, fontSize: '9px', color: '#8ef2a8' })
                .setOrigin(1, 0.5).setDepth(30002).setInteractive({ useHandCursor: true });
            const upd = () => v.setText(get() ? 'ВКЛ' : 'ВЫКЛ').setColor(get() ? '#8ef2a8' : '#ff5470');
            this.taps.add(VW / 2 + 60, y, 120, 20, () => { Audio.play('ui'); set(!get()); upd(); });
            upd();
        };
        row(172, 'Музыка', () => Save.get('music', true), v => { Save.setting('music', v); Audio.setMusic(v); });
        row(192, 'Звуки', () => Save.get('sfx', true), v => { Save.setting('sfx', v); Audio.setSfx(v); });
        row(212, 'Тряска', () => Save.get('shake', true), v => Save.setting('shake', v));
        row(232, 'Цифры урона', () => Save.get('showDamage', true), v => Save.setting('showDamage', v));
        const VOLS = [1, 0.7, 0.4, 0];
        const volRow = (y, label, get, set) => {
            this.add.text(VW / 2 - 80, y, label, FONTS.body).setOrigin(0, 0.5).setDepth(30002);
            const v = this.add.text(VW / 2 + 90, y, '', { ...FONTS.num, fontSize: '9px', color: '#8ee6ff' })
                .setOrigin(1, 0.5).setDepth(30002).setInteractive({ useHandCursor: true });
            const upd = () => v.setText(Math.round(get() * 100) + '%');
            v.on('pointerdown', () => {
                Audio.play('ui');
                const cur = VOLS.indexOf(get());
                set(VOLS[(cur + 1) % VOLS.length]);
                upd();
            });
            upd();
        };
        volRow(256, 'Громкость музыки', () => Save.get('musicVol', 1), v => Audio.setMusicVol(v));
        volRow(276, 'Громкость эффектов', () => Save.get('sfxVol', 1), v => Audio.setSfxVol(v));

        const quit = () => {
            Audio.play('uiBack');
            this.scene.stop('Game');
            this.scene.stop();
            this.scene.start('Menu');
        };
        makeButton(this, VW / 2, 306, 200, 24, 'ПОКИНУТЬ ВАХТУ', quit, { icon: 'ic_close', fontSize: 8, depth: 30002 });
        this.taps.add(VW / 2, 306, 200, 24, quit);

        this.amb = this.add.particles(320, 380, 'atlas', {
            frame: ['mote_amber_0', 'mote_cyan_1'],
            x: { min: 0, max: 640 }, y: 380,
            speedY: { min: -36, max: -12 }, speedX: { min: -6, max: 6 },
            lifespan: { min: 3000, max: 6000 }, scale: { start: 1, end: 0 },
            frequency: 260, blendMode: 'ADD', alpha: 0.4
        }).setDepth(30006);

        this.input.keyboard.once('keydown-ESC', () => this.resume());
    }

    resume() {
        Audio.play('ui');
        this.scene.resume('Game');
        this.scene.stop();
    }
}

function fmt(sec) {
    sec = Math.floor(sec);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

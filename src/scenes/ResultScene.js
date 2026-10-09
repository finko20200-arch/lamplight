import { drawPanel, makeButton, FONTS } from '../ui/widgets.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';

const VW = 640, VH = 360;

export class ResultScene extends Phaser.Scene {
    constructor() { super('Result'); }

    init(data) { this.r = data; }

    create() {
        this.cameras.main.setBackgroundColor('#08060d');
        const won = this.r.won;

        // backdrop
        this.ground = this.add.tileSprite(VW / 2, VH / 2, VW, VH, 'ground').setDepth(0);
        this.add.rectangle(VW / 2, VH / 2, VW, VH, won ? 0x2a1a08 : 0x0a0716, 0.72).setDepth(1);

        if (won && !location.search.includes('nodawn')) {
            this.dawn = this.add.image(VW / 2, VH + 40, 'atlas', 'soft_glow').setTint(0xffb347)
                .setBlendMode(Phaser.BlendModes.ADD).setScale(22, 9).setAlpha(0.5).setDepth(2);
        }

        const g = this.add.graphics().setDepth(10);
        drawPanel(g, VW / 2 - 190, 44, 380, 272, { fill: 0x171226, alpha: 0.97, border: won ? 0xffc93c : 0x8a0f2c });

        this.add.text(VW / 2, 84, won ? 'РАССВЕТ' : 'ТЬМА ПОГЛОТИЛА', {
            ...FONTS.title, fontSize: '22px', color: won ? '#ffd98a' : '#ff5470'
        }).setOrigin(0.5).setDepth(11);
        this.add.text(VW / 2, 100, won ? 'вахта окончена — фонарь погас сам' : 'фонарь погас. лес забрал ещё одного', FONTS.small)
            .setOrigin(0.5).setDepth(11);

        const rows = [
            ['ВОЛНА', this.r.totalWaves ? `${this.r.wave || 1}/${this.r.totalWaves}` : `∞ ${this.r.wave || 1}`],
            ['ВРЕМЯ', fmt(this.r.time)],
            ['УБИЙСТВ', String(this.r.kills)],
            ['УРОВЕНЬ', String(this.r.level)],
            ['ЗОЛОТО', `+${this.r.gold}${this.r.firstWin ? ' +250' : ''}`]
        ];
        rows.forEach(([a, b], i) => {
            this.add.text(VW / 2 - 140, 136 + i * 26, a, FONTS.body).setDepth(11);
            this.add.text(VW / 2 + 140, 136 + i * 26, b, { ...FONTS.num, color: i === 3 ? '#ffc93c' : '#f6ead2' })
                .setOrigin(1, 0.5).setDepth(11);
        });

        const NAMES = { sparks: 'Искры', blades: 'Клинки', nova: 'Нова', runes: 'Руны', lance: 'Копьё', flasks: 'Флаконы', solar: 'Шквал', dawnblade: 'Рассвет', ashstorm: 'Буря', burn: 'Горение', bomb: 'Бомба', rune: 'Руны' };
        const ds = Object.entries(this.r.dmgStats || {}).filter(([k]) => k !== 'test').sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (ds.length) {
            const tot = ds.reduce((a, e) => a + e[1], 0) || 1;
            this.add.text(VW / 2, 244, 'УРОН: ' + ds.map(([k, v]) => `${NAMES[k] || k} ${Math.round(v / tot * 100)}%`).join(' · '),
                { ...FONTS.small, color: '#ffb347' }).setOrigin(0.5).setDepth(11);
        }
        if (won) {
            const stars = 1 + ((this.r.revivesUsed || 0) === 0 ? 1 : 0) + (this.r.level >= 12 ? 1 : 0);
            this.add.text(VW / 2, 258, '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars),
                { ...FONTS.title, fontSize: '16px', color: '#ffc93c' }).setOrigin(0.5).setDepth(11);
        }
        if (this.r.firstWin) {
            this.add.text(VW / 2, 272, 'ПЕРВАЯ ПОБЕДА! +250 золота, открыт БЕСКОНЕЧНЫЙ режим',
                { ...FONTS.small, color: '#8ef2a8' }).setOrigin(0.5).setDepth(11);
        }
        const s = Save.data.stats;
        let extra = `РЕКОРД ${fmt(s.bestTime)} · ПОБЕД ${s.wins}/${s.runs}`;
        if (this.r.kills >= s.bestKills && this.r.kills > 0) { extra += ' · НОВЫЙ РЕКОРД УБИЙСТВ!'; }
        this.add.text(VW / 2, 286, extra, { ...FONTS.small, color: '#8ee6ff' }).setOrigin(0.5).setDepth(11);
        this.add.text(VW / 2, 299, `ЗОЛОТО В КУБЫШКЕ: ${Save.data.gold} — потрать его на Алтаре`, FONTS.small).setOrigin(0.5).setDepth(11);

        this.amb = this.add.particles(320, 380, 'atlas', {
            frame: ['mote_amber_0', 'mote_cyan_1'],
            x: { min: 0, max: 640 }, y: 380,
            speedY: { min: -40, max: -12 }, speedX: { min: -8, max: 8 },
            lifespan: { min: 3000, max: 6000 }, scale: { start: 1.1, end: 0 },
            frequency: 220, blendMode: 'ADD', alpha: 0.5
        }).setDepth(12);

        makeButton(this, VW / 2 - 100, 328, 150, 26, 'ЕЩЁ РАЗ', () => { Audio.play('ui'); this.scene.start('Game'); }, { icon: 'ic_play', fontSize: 9, depth: 12 });
        makeButton(this, VW / 2 + 20, 328, 110, 26, 'АЛТАРЬ', () => { Audio.play('ui'); this.scene.launch('Altar'); }, { icon: 'ic_crown', fontSize: 8, depth: 12 });
        makeButton(this, VW / 2 + 130, 328, 100, 26, 'МЕНЮ', () => { Audio.play('uiBack'); this.scene.start('Menu'); }, { icon: 'ic_close', fontSize: 8, depth: 12 });
    }

    update(t) {
        this.ground.tilePositionY -= 0.05;
        if (this.dawn) { this.dawn.setAlpha(0.45 + Math.sin(t * 0.002) * 0.08); }
    }
}

function fmt(sec) {
    sec = Math.floor(sec || 0);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

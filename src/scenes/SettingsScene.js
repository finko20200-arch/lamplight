import { drawPanel, makeButton, FONTS } from '../ui/widgets.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';
import { Platform } from '../core/Platform.js';
import { Taps } from '../ui/tap.js';

const VW = 640, VH = 360;

/**
 * Settings as a dedicated overlay scene (renders & receives input reliably,
 * cleans itself up on stop — unlike the old in-menu panel).
 */
export class SettingsScene extends Phaser.Scene {
    constructor() { super('Settings'); }

    create() {
        this.nodes = [];
        this.taps = new Taps(this);
        const dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x06040c, 0.8).setDepth(30000);
        // NOTE: interactive dim must be registered BEFORE rows: Phaser resolves
        // pointer hits in reverse addition order, so later-added rows win.
        this.taps.add(60, VH / 2, 100, 200, () => this.close());
        this.taps.add(VW - 60, VH / 2, 100, 200, () => this.close());
        const g = this.add.graphics().setDepth(30001);
        drawPanel(g, VW / 2 - 180, 34, 360, 292, { fill: 0x171226, alpha: 0.98 });
        this.add.text(VW / 2, 52, 'НАСТРОЙКИ', { ...FONTS.h2, color: '#8ee6ff' }).setOrigin(0.5).setDepth(30002);

        const reg = (o) => { this.nodes.push(o); return o; };

        const row = (y, label, get, set, fmt) => {
            reg(this.add.text(VW / 2 - 160, y, label, FONTS.body).setOrigin(0, 0.5).setDepth(30002));
            const v = reg(this.add.text(VW / 2 + 160, y, '', { ...FONTS.num, fontSize: '10px', color: '#8ef2a8' })
                .setOrigin(1, 0.5).setDepth(30003));
            const upd = () => {
                const val = get();
                v.setText(fmt ? fmt(val) : (val ? 'ВКЛ' : 'ВЫКЛ')).setColor(val ? '#8ef2a8' : '#ff5470');
            };
            this.taps.add(VW / 2 + 110, y, 120, 20, () => { Audio.play('ui'); set(!get()); upd(); });
            upd();
        };

        const VOLS = [1, 0.7, 0.4, 0];
        const volRow = (y, label, get, set) => {
            reg(this.add.text(VW / 2 - 160, y, label, FONTS.body).setOrigin(0, 0.5).setDepth(30002));
            const v = reg(this.add.text(VW / 2 + 160, y, '', { ...FONTS.num, fontSize: '10px', color: '#8ee6ff' })
                .setOrigin(1, 0.5).setDepth(30003));
            const upd = () => v.setText(Math.round(get() * 100) + '%');
            this.taps.add(VW / 2 + 110, y, 120, 20, () => { Audio.play('ui'); set(VOLS[(VOLS.indexOf(get()) + 1) % VOLS.length]); upd(); });
            upd();
        };

        const cycRow = (y, label, opts, get, set, note) => {
            reg(this.add.text(VW / 2 - 160, y, label, FONTS.body).setOrigin(0, 0.5).setDepth(30002));
            const v = reg(this.add.text(VW / 2 + 160, y, '', { ...FONTS.num, fontSize: '10px', color: '#ffc93c' })
                .setOrigin(1, 0.5).setDepth(30003));
            const upd = () => v.setText(String(get()).toUpperCase() + (note || ''));
            this.taps.add(VW / 2 + 110, y, 120, 20, () => { Audio.play('ui'); set(opts[(opts.indexOf(get()) + 1) % opts.length]); upd(); });
            upd();
        };

        row(80, 'Музыка', () => Save.get('music', true), v => { Save.setting('music', v); Audio.setMusic(v); });
        row(104, 'Звуки', () => Save.get('sfx', true), v => { Save.setting('sfx', v); Audio.setSfx(v); });
        volRow(128, 'Громкость музыки', () => Save.get('musicVol', 1), v => Audio.setMusicVol(v));
        volRow(152, 'Громкость эффектов', () => Save.get('sfxVol', 1), v => Audio.setSfxVol(v));
        row(176, 'Тряска экрана', () => Save.get('shake', true), v => Save.setting('shake', v));
        row(200, 'Цифры урона', () => Save.get('showDamage', true), v => Save.setting('showDamage', v));
        row(224, 'Пост-FX', () => Save.get('postfx', false), v => Save.setting('postfx', v));
        row(248, 'Чёткие пиксели', () => Save.get('crisp', false), v => { Save.setting('crisp', v); if (window.__applyZoom) { window.__applyZoom(); } });
        cycRow(272, 'Профиль графики', ['auto', 'low', 'mid', 'high'], () => Save.get('tier', 'auto'), v => Save.setting('tier', v));
        cycRow(296, 'Кадр/с', [60, 30], () => Save.get('fpsCap', 60), v => Save.setting('fpsCap', v), ' (рестарт)');

        const cb = makeButton(this, VW / 2, 336, 150, 22, 'ЗАКРЫТЬ', () => this.close(), { icon: 'ic_close', fontSize: 8, depth: 30005 });
        cb.zone.disableInteractive();
        this.taps.add(VW / 2, 336, 150, 22, () => this.close());
        this.input.keyboard.once('keydown-ESC', () => this.close());

        this.amb = this.add.particles(320, 380, 'atlas', {
            frame: ['mote_amber_0', 'mote_cyan_1'],
            x: { min: 0, max: 640 }, y: 380,
            speedY: { min: -36, max: -12 }, speedX: { min: -6, max: 6 },
            lifespan: { min: 3000, max: 6000 }, scale: { start: 1, end: 0 },
            frequency: 260, blendMode: 'ADD', alpha: 0.4
        }).setDepth(30006);
    }

    close() {
        Audio.play('uiBack');
        this.scene.stop();
    }

    shutdown() {
        this.nodes.forEach(o => o.destroy());
        this.nodes.length = 0;
    }
}

import { drawPanel, pips, FONTS, makeButton } from '../ui/widgets.js';
import { RARITY, rollChoices, applyChoice } from '../systems/UpgradeSystem.js';
import { Audio } from '../core/Audio.js';
import { WEAPONS, PASSIVES } from '../data/game.js';
import { Taps } from '../ui/tap.js';

const VW = 640, VH = 360;

/** Level-up draft overlay: 4 cards, keys 1-4 or click, limited rerolls. */
export class UpgradeScene extends Phaser.Scene {
    constructor() { super('Upgrade'); }

    init(data) {
        this.choices = data.choices;
        this.game = data.game;
    }

    create() {
        this.taps = new Taps(this);
        this.nodes = [];
        this.dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x06040c, 0.78).setDepth(30000);

        this.title = this.add.text(VW / 2, 52, 'НОВЫЙ УРОВЕНЬ', { ...FONTS.h2, color: '#ffd98a' })
            .setOrigin(0.5).setDepth(30001);
        this.sub = this.add.text(VW / 2, 72, 'выбери дар фонаря', FONTS.small).setOrigin(0.5).setDepth(30001);

        this.buildCards(this.choices);

        // reroll
        this.rerollBtn = makeButton(this, VW - 74, VH - 26, 120, 24, `ПЕРЕБОР ${this.game.rerolls}`, () => this.reroll(), { icon: 'ic_luck', fontSize: 8, depth: 30002 });
        this.rerollBtn.zone.disableInteractive();
        this.taps.add(VW - 74, VH - 26, 120, 24, () => this.reroll());

        // ambient embers keep the draft alive
        this.amb = this.add.particles(320, 380, 'atlas', {
            frame: ['mote_amber_0', 'mote_cyan_1'],
            x: { min: 0, max: 640 }, y: 380,
            speedY: { min: -44, max: -14 }, speedX: { min: -8, max: 8 },
            lifespan: { min: 2600, max: 5200 }, scale: { start: 1.1, end: 0 },
            frequency: 180, blendMode: 'ADD', alpha: 0.55
        }).setDepth(30006);

        this.keys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR');
        this.input.keyboard.on('keydown', (e) => {
            const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4 };
            if (map[e.code] !== undefined) { this.pick(map[e.code]); }
        });
    }

    buildCards(choices) {
        this.nodes.forEach(n => n.forEach(o => o.destroy()));
        this.nodes = [];
        this.zones = [];
        const cardW = choices.length > 4 ? 118 : 138, cardH = 176, gap = 8;
        const total = choices.length * cardW + (choices.length - 1) * gap;
        const x0 = VW / 2 - total / 2 + cardW / 2;

        choices.forEach((c, i) => {
            const x = x0 + i * (cardW + gap);
            const y = 178;
            const n = [];
            const g = this.add.graphics().setDepth(30001);
            const rar = RARITY[c.rarity] || RARITY.common;
            drawPanel(g, x - cardW / 2, y - cardH / 2, cardW, cardH, { fill: 0x14101f, alpha: 0.97, border: rar.color });
            g.fillStyle(rar.color, 0.16);
            g.fillRect(x - cardW / 2 + 1, y - cardH / 2 + 1, cardW - 2, 26);
            n.push(g);

            const icon = this.add.image(x, y - cardH / 2 + 40, 'atlas', c.icon).setScale(1.7).setDepth(30002);
            n.push(icon);
            const glow = this.add.image(x, y - cardH / 2 + 40, 'atlas', 'soft_glow').setTint(rar.color)
                .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(2.6).setDepth(30001);
            n.push(glow);

            n.push(this.add.text(x, y - cardH / 2 + 70, c.name, { ...FONTS.body, fontSize: '13px', color: '#fffaf0' })
                .setOrigin(0.5).setDepth(30002));
            n.push(this.add.text(x, y - cardH / 2 + 84, rar.name, { ...FONTS.small, fontSize: '10px', color: Phaser.Display.Color.IntegerToColor(rar.color).rgba })
                .setOrigin(0.5).setDepth(30002));

            if (c.level) {
                const pg = this.add.graphics().setDepth(30002);
                pips(pg, x - (c.max * 6) / 2, y - cardH / 2 + 94, c.level, c.max, rar.color);
                n.push(pg);
            }

            const desc = this.add.text(x, y + 6, c.desc, { ...FONTS.small, fontSize: '11px', color: '#d9cfe8', align: 'center' })
                .setOrigin(0.5, 0).setDepth(30002);
            desc.setWordWrapWidth(cardW - 18);
            n.push(desc);

            n.push(this.add.text(x, y + cardH / 2 - 14, `[${i + 1}]`, { ...FONTS.num, fontSize: '9px', color: '#6d5c96' })
                .setOrigin(0.5).setDepth(30002));

            const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true }).setDepth(30003);
            zone.disableInteractive();
            this.taps.add(x, y, cardW, cardH, () => this.pick(i));
            zone.on('pointerover', () => { g.clear(); drawPanel(g, x - cardW / 2, y - cardH / 2, cardW, cardH, { fill: 0x1d1730, alpha: 0.97, border: rar.color, hi: rar.color }); icon.setScale(1.85); });
            zone.on('pointerout', () => { g.clear(); drawPanel(g, x - cardW / 2, y - cardH / 2, cardW, cardH, { fill: 0x14101f, alpha: 0.97, border: rar.color }); icon.setScale(1.7); });
            n.push(zone);
            this.nodes.push(n);
        });
    }

    reroll() {
        if (this.game.rerolls <= 0) { Audio.play('deny'); return; }
        this.game.rerolls--;
        Audio.play('ui');
        this.rerollBtn.setLabel(`ПЕРЕБОР ${this.game.rerolls}`);
        this.choices = rollChoices(this.game, this.game.playerStats.cards || 4, this.game.playerStats.luck);
        this.buildCards(this.choices);
    }

    pick(i) {
        const c = this.choices[i];
        if (!c) { return; }
        Audio.play('upgrade');
        applyChoice(this.game, c);
        this.game.hud.setWeaponTray([...this.game.weapons.keys()]);
        this.game.hud.refreshWeaponPips(this.game);
        this.game.hud.setPassiveTray(Object.entries(this.game.passives));
        if (this.game.pendingLevels > 0) {
            this.game.pendingLevels--;
            this.choices = rollChoices(this.game, this.game.playerStats.cards || 4, this.game.playerStats.luck);
            this.buildCards(this.choices);
            this.title.setText(`НОВЫЙ УРОВЕНЬ (${this.game.pendingLevels + 1})`);
            Audio.play('levelup');
        } else {
            this.scene.resume('Game');
            this.scene.stop();
        }
    }
}

import { drawPanel, pips, makeButton, FONTS } from '../ui/widgets.js';
import { ALTAR, altarCost } from '../data/game.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';
import { Taps } from '../ui/tap.js';

const VW = 640, VH = 360;

/** Meta-progression shop: permanent upgrades bought with run gold. */
export class AltarScene extends Phaser.Scene {
    constructor() { super('Altar'); }

    create() {
        this.nodes = [];
        this.taps = new Taps(this);
        this.dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x06040c, 0.86).setDepth(30000)
            .setInteractive();
        const g = this.add.graphics().setDepth(30001);
        drawPanel(g, 40, 10, VW - 80, 318, { fill: 0x171226, alpha: 0.98, border: 0xffc93c });

        this.add.text(VW / 2, 26, 'АЛТАРЬ ПАМЯТИ', { ...FONTS.h2, color: '#ffc93c' }).setOrigin(0.5).setDepth(30002);
        this.goldText = this.add.text(VW / 2, 42, '', { ...FONTS.num, color: '#ffc93c' }).setOrigin(0.5).setDepth(30002);

        const keys = Object.keys(ALTAR);
        keys.forEach((id, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const x = 60 + col * 290;
            const y = 58 + row * 40;
            const n = [];
            n.push(this.add.image(x, y + 10, 'atlas', ALTAR[id].icon).setScale(0.9).setDepth(30002));
            n.push(this.add.text(x + 16, y + 4, ALTAR[id].name, { ...FONTS.body, fontSize: '12px', color: '#fffaf0' }).setOrigin(0, 0.5).setDepth(30002));
            const desc = this.add.text(x + 16, y + 17, ALTAR[id].desc, { ...FONTS.small, fontSize: '9px', color: '#bfb2d6' })
                .setOrigin(0, 0.5).setDepth(30002);
            desc.setWordWrapWidth(168);
            n.push(desc);
            const pg = this.add.graphics().setDepth(30002);
            n.push(pg);
            const btn = makeButton(this, x + 236, y + 10, 52, 18, '', () => this.buy(id), { fontSize: 8, depth: 30003 });
            n.push(btn.cont);
            this.taps.add(x + 236, y + 10, 52, 18, () => this.buy(id));
            btn.zone.disableInteractive();
            this.nodes.push({ id, pg, btn, x, y });
        });

        const closeBtn = makeButton(this, VW / 2, 340, 140, 20, 'ЗАКРЫТЬ', () => { Audio.play('uiBack'); this.scene.stop(); }, { icon: 'ic_close', fontSize: 8, depth: 30003 });
        closeBtn.zone.disableInteractive();
        this.taps.add(VW / 2, 340, 140, 20, () => { Audio.play('uiBack'); this.scene.stop(); });
        this.nodes.forEach(n => { if (n.btn && n.btn.zone) { n.btn.zone.disableInteractive(); } });
        this.input.keyboard.once('keydown-ESC', () => this.scene.stop());
        this.refresh();
    }

    refresh() {
        this.goldText.setText(`ЗОЛОТО: ${Save.data.gold}`);
        for (const n of this.nodes) {
            const lvl = Save.altarLevel(n.id);
            const def = ALTAR[n.id];
            n.pg.clear();
            pips(n.pg, n.x + 16, n.y + 26, lvl, def.max, 0xffc93c);
            if (lvl >= def.max) {
                n.btn.setLabel('МАКС');
                n.btn.zone.disableInteractive();
            } else {
                const cost = altarCost(n.id, lvl);
                n.btn.setLabel(String(cost));
                n.btn.zone.setInteractive({ useHandCursor: true });
                n.btn.txt.setColor(Save.data.gold >= cost ? '#ffc93c' : '#6d5c96');
            }
        }
    }

    buy(id) {
        const lvl = Save.altarLevel(id);
        if (lvl >= ALTAR[id].max) { return; }
        const cost = altarCost(id, lvl);
        if (!Save.spendGold(cost)) { Audio.play('deny'); return; }
        Save.altarSet(id, lvl + 1);
        Audio.play('chest');
        this.refresh();
    }
}

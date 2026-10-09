import { buildSprites, buildTerrain, buildAnimations, buildVignette } from '../art/AtlasBuilder.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';

export class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
        this.loadText = this.add.text(320, 170, 'ЗАЖИГАЕМ ФОНАРИ…', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#ffd98a',
            stroke: '#08060d', strokeThickness: 3
        }).setOrigin(0.5);
        this.bar = this.add.graphics();
    }

    create() {
        // wait for the embedded pixel fonts before rasterising any text
        // (raced with a timeout: under virtual-time / odd environments fonts.ready can stall)
        const fontsReady = (document.fonts && document.fonts.ready)
            ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, location.search.includes('autostart') ? 0 : 1200))])
            : Promise.resolve();
        fontsReady.then(() => {
            buildTerrain(this);
            buildVignette(this);
            const sheets = buildSprites(this);
            buildAnimations(this);
            console.log(`[lamplight] atlas sheets: ${sheets}`);
            this.time.delayedCall(120, () => {
                const q = new URLSearchParams(location.search);
                if (q.has('result')) {
                    this.scene.start('Result', {
                        won: q.get('won') !== '0', time: 600, kills: 213, level: 14, gold: 386
                    });
                } else if (q.has('autostart')) { this.scene.start('Game'); }
                else { this.scene.start('Menu'); }
            });
        });
    }

    update() {
        const t = this.time.now * 0.004;
        this.bar.clear();
        this.bar.fillStyle(0x241c3a, 1);
        this.bar.fillRect(220, 190, 200, 6);
        this.bar.fillStyle(0xffb347, 1);
        this.bar.fillRect(220, 190, Math.round(100 + Math.sin(t) * 100), 6);
    }
}

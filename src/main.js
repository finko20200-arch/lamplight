import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { AltarScene } from './scenes/AltarScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { Audio } from './core/Audio.js';
import { Save } from './core/Save.js';

/**
 * LAMPLIGHT: Последняя вахта
 * 2D survivor на Phaser 4 · процедурный пиксель-арт · процедурный звук
 */

const forceCanvas = location.search.includes('renderer=canvas');

const config = {
    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
    width: 640,
    height: 360,
    parent: 'game',
    pixelArt: true,
    backgroundColor: '#08060d',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    render: {
        antialias: false,
        roundPixels: true,
        powerPreference: 'high-performance'
    },
    input: { activePointers: 3 },
    fps: { limit: Number(Save.get('fpsCap', 60)) || 60 },
    disableContextMenu: true,
    banner: false,
    title: 'LAMPLIGHT',
    version: '1.0.0',
    scene: [BootScene, MenuScene, GameScene, UpgradeScene, PauseScene, ResultScene, AltarScene, SettingsScene]
};

// crisp integer-pixel zoom (optional, for large displays)
export function applyZoom() {
    const gm = window.__game;
    if (!gm) { return; }
    if (Save.get('crisp', false)) {
        const z = Math.max(1, Math.min(Math.floor(window.innerWidth / 640), Math.floor(window.innerHeight / 360)));
        gm.scale.setZoom(z);
    } else {
        gm.scale.setZoom(1);
    }
}

// crisp pixel text: rasterise every Text at 2x, upscale stays blocky-sharp
(function patchTextResolution() {
    const F = Phaser.GameObjects.GameObjectFactory.prototype;
    if (!F.text || F.__resPatched) { return; }
    const orig = F.text;
    F.text = function (...a) {
        const t = orig.apply(this, a);
        try { t.setResolution(2); } catch (e) { /* noop */ }
        return t;
    };
    F.__resPatched = true;
})();

// audio needs a user gesture
const unlock = () => {
    Audio.init();
    Audio.resume();
    Audio.setMusic(Save.get('music', true));
    Audio.setSfx(Save.get('sfx', true));
};
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

window.addEventListener('load', () => {
    window.__game = new Phaser.Game(config);
    window.__lamplight = { Audio, Save };
    window.__applyZoom = applyZoom;
});

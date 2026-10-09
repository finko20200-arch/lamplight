/**
 * TapRegistry — manual pointer hit-testing for overlay UI.
 *
 * GameObject-level input proved order-sensitive in launched overlay scenes,
 * and frame-polled pointer flags miss sub-frame taps (fast real taps and
 * synthetic clicks). This registry listens to the scene input plugin's
 * 'pointerdown' event (fires for every pointer down over the canvas) and
 * resolves registered rects itself. Works in any scene, any renderer.
 */
export class Taps {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
        // DOM-level listener on the game canvas: immune to scene-input quirks,
        // works in launched overlays, touch and mouse, any renderer.
        this._canvas = scene.sys.game.canvas;
        this._onDown = (e) => {
            if (window.__tapDebug) { console.log('[tapdom]', this.scene.scene.key, e.clientX, e.clientY); }
            const r = this._canvas.getBoundingClientRect();
            if (!r.width || !r.height) { return; }
            const gw = scene.sys.game.config.width, gh = scene.sys.game.config.height;
            const x = (e.clientX - r.left) * (gw / r.width);
            const y = (e.clientY - r.top) * (gh / r.height);
            this.handle(x, y);
        };
        this._canvas.addEventListener('pointerdown', this._onDown, true);
        scene.events.once('shutdown', () => {
            this._canvas.removeEventListener('pointerdown', this._onDown, true);
            this.list.length = 0;
        });
    }

    /** Register a rect centred at x,y. Callback on pointer down. */
    add(x, y, w, h, cb) {
        this.list.push({ x: x - w / 2, y: y - h / 2, w, h, cb });
        return this;
    }

    clear() { this.list.length = 0; }

    handle(px, py) {
        if (window.__tapDebug) { console.log('[taphandle]', this.scene.scene.key, Math.round(px), Math.round(py), 'rects', this.list.length); }
        for (let i = this.list.length - 1; i >= 0; i--) {
            const r = this.list[i];
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
                if (window.__tapDebug) { console.log('[taphit]', i); }
                r.cb();
                break;
            }
        }
    }
}

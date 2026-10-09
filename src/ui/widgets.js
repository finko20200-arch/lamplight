/**
 * Reusable pixel-art UI widgets: bevelled panels, buttons, pips.
 * Everything is drawn with Graphics so it stays crisp at any scale.
 */

export function drawPanel(g, x, y, w, h, opts = {}) {
    const { fill = 0x171226, alpha = 0.94, border = 0x4a3d6b, hi = 0x6d5c96, shadow = 0x0d0a16 } = opts;
    g.fillStyle(shadow, alpha);
    g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle(fill, alpha);
    g.fillRect(x, y, w, h);
    g.fillStyle(border, 1);
    g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
    g.fillStyle(hi, 0.7);
    g.fillRect(x + 1, y + 1, w - 2, 1);
    g.fillRect(x + 1, y + 1, 1, h - 2);
    g.fillStyle(shadow, 0.8);
    g.fillRect(x + 1, y + h - 2, w - 2, 1);
    g.fillRect(x + w - 2, y + 1, 1, h - 2);
    // corner notches
    g.fillStyle(shadow, 0);
    return g;
}

export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
    const { icon = null, fontSize = 12, font = '"Press Start 2P", monospace', color = '#f2e6c8', accent = 0x4a3d6b } = opts;
    const cont = scene.add.container(x, y).setDepth(opts.depth ?? 30000);
    const g = scene.add.graphics();
    cont.add(g);

    let img = null;
    if (icon) {
        img = scene.add.image(-w / 2 + 16, 0, 'atlas', icon).setScale(0.8);
        cont.add(img);
    }
    const txt = scene.add.text(icon ? -w / 2 + 30 : 0, 0, label, {
        fontFamily: font, fontSize: fontSize + 'px', color, stroke: '#08060d', strokeThickness: 3
    }).setOrigin(icon ? 0 : 0.5, 0.5);
    cont.add(txt);

    const paint = (hover) => {
        g.clear();
        drawPanel(g, -w / 2, -h / 2, w, h, {
            fill: hover ? 0x241c3a : 0x171226,
            border: hover ? 0x9d8ac4 : accent
        });
        if (hover) {
            g.fillStyle(accent, 0.35);
            g.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
        }
    };
    paint(false);

    const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    cont.add(zone);
    zone.on('pointerover', () => { paint(true); cont.setScale(1.03); });
    zone.on('pointerout', () => { paint(false); cont.setScale(1); });
    zone.on('pointerdown', () => {
        paint(false);
        onClick && onClick();
    });
    cont.setInteractive = undefined;
    return { cont, txt, img, setLabel: (s) => txt.setText(s), zone, paint };
}

export function pips(g, x, y, count, max, on = 0xffd75e, off = 0x352b52) {
    for (let i = 0; i < max; i++) {
        g.fillStyle(i < count ? on : off, 1);
        g.fillRect(x + i * 6, y, 4, 4);
        g.fillStyle(0x0d0a16, 1);
        g.fillRect(x + i * 6 + 4, y, 1, 4);
    }
}

export const FONTS = {
    title: { fontFamily: '"Press Start 2P", monospace', fontSize: '28px', color: '#ffd98a', stroke: '#08060d', strokeThickness: 6 },
    h2: { fontFamily: '"Press Start 2P", monospace', fontSize: '14px', color: '#ffd98a', stroke: '#08060d', strokeThickness: 4 },
    num: { fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#f6ead2', stroke: '#08060d', strokeThickness: 3 },
    body: { fontFamily: '"Pixelify Sans", monospace', fontSize: '15px', color: '#f2e6c8', stroke: '#08060d', strokeThickness: 3 },
    small: { fontFamily: '"Pixelify Sans", monospace', fontSize: '12px', color: '#cbbfe0', stroke: '#08060d', strokeThickness: 2 }
};

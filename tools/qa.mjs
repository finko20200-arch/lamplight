/**
 * Headless playtest & screenshot QA.
 *
 * NOTE: this sandbox remaps absolute /home/user paths inside any process that
 * imports playwright-core, so every artifact is written through a clean child
 * node process (plain fs, no remapping).
 */
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const OUT = path.resolve('qa/shots');
const URL = process.argv[2] || 'http://127.0.0.1:8124/index.html?quality=low';

function save(file, buf) {
    const r = spawnSync(process.execPath, ['-e',
        'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{' +
        'require("fs").mkdirSync(require("path").dirname(process.argv[1]),{recursive:true});' +
        'require("fs").writeFileSync(process.argv[1],Buffer.from(b,"base64"));});',
        file], { input: buf.toString('base64'), maxBuffer: 1 << 28 });
    if (r.status !== 0) { console.log('save failed', file, r.error?.message, r.stderr?.toString()); }
}

const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox',
        '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') { logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`); }
});
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));

const shot = async (name) => save(`${OUT}/${name}.png`, await page.screenshot());
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, { timeout: 30000 });
await wait(2200);
await shot('01-menu');

await page.keyboard.press('Enter');
await wait(3200);
await shot('02-game-early');

await page.keyboard.down('KeyD');
await page.keyboard.down('KeyS');
await wait(1300);
await page.keyboard.up('KeyD');
await page.keyboard.up('KeyS');
await page.keyboard.press('Space');
await wait(600);
await shot('03-game-move');

await page.evaluate(() => { window.__game.scene.getScene('Game').addXp(50); });
await wait(900);
await shot('04-upgrade');
await page.keyboard.press('Digit1');
await wait(500);

await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    for (let i = 0; i < 70; i++) { g.spawnEnemy(g.pickType()); }
    g.spawnEnemy('husk', g.player.x + 90, g.player.y + 40, true);
});
await wait(2600);
await shot('05-game-combat');

await page.evaluate(() => { window.__game.scene.getScene('Game').spawnBoss(1); });
await wait(3200);
await shot('06-boss');

const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 2000) { requestAnimationFrame(tick); } else { res(Math.round(n / 2)); } };
    requestAnimationFrame(tick);
}));

await page.keyboard.press('Escape');
await wait(700);
await shot('07-pause');
await page.keyboard.press('Escape');
await wait(500);

await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.revives = 0; g.player.hp = 1; g.player.invuln = 0; g.player.hurtCd = 0;
    g.player.hurt(999, g.player.x + 10, g.player.y);
});
await wait(2600);
await shot('08-result');

const counts = await page.evaluate(() => {
    const g = window.__game?.scene?.getScene('Game');
    return g ? { enemies: g.enemies.length, shots: g.shots.length, pickups: g.loot.pickups.length, chunks: g.chunks.size } : null;
});

console.log('FPS (swiftshader, software GL):', fps);
console.log('live objects:', JSON.stringify(counts));
console.log('--- console/errors ---');
console.log(logs.slice(0, 40).join('\n') || '(clean)');
await browser.close();

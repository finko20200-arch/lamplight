/**
 * Full-cycle automated playtest: an in-page bot kites enemies, collects loot,
 * picks draft cards; the harness logs metrics and captures key moments.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9511;
const URL = process.argv[2] || 'http://127.0.0.1:8125/index.html?renderer=canvas&autostart&ts=5';

const chrome = spawn(CHROME, ['--headless', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=640,360',
    '--mute-audio', '--no-zygote', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const errors = [];
chrome.stderr.on('data', d => {
    for (const l of d.toString().split('\n')) {
        if (/CONSOLE.*error/i.test(l)) { errors.push(l.replace(/.*CONSOLE[^"]*"/, '').slice(0, 240)); }
    }
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1600);
let list = null;
for (let i = 0; i < 12 && !list; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) })).json(); }
    catch (e) { await sleep(500); }
}
if (!list) { console.log('chrome unreachable'); process.exit(1); }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl, { maxPayload: 1 << 26 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push('[EXC] ' + (d.exception?.description || d.text || '').split('\n').slice(0, 3).join(' | ').slice(0, 300));
    }
});
const send = (me, pa = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: me, params: pa })); });
const ev = async (e) => (await Promise.race([send('Runtime.evaluate', { expression: e, returnByValue: true }), sleep(5000).then(() => null)]))?.result?.result?.value;
const shot = async (n) => {
    const r = await Promise.race([send('Page.captureScreenshot', { format: 'png' }), sleep(12000).then(() => null)]);
    if (r?.result?.data) { fs.writeFileSync(path.join(OUT, n + '.png'), Buffer.from(r.result.data, 'base64')); console.log('shot', n); }
    else console.log('shot-miss', n);
};
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL });

// install the bot once the game exists
await sleep(3500);
await ev(`(() => { const g = window.__game.scene.getScene('Game'); if (g && g.addWeapon) { g.addWeapon('blades'); g.addWeapon('nova'); g.addWeapon('lance'); g.passives.power = 3; g.passives.haste = 2; g.recalcStats(); } return 1; })()`);
await ev(`
window.__botOn = true;
setInterval(() => {
    if (!window.__botOn) return;
    const gm = window.__game; if (!gm) return;
    if (gm.scene.isActive('Upgrade')) { const u = gm.scene.getScene('Upgrade'); if (u && u.choices) u.pick(Math.floor(Math.random() * u.choices.length)); return; }
    const g = gm.scene.getScene('Game'); if (!g || !g.player || g.over) return;
    const p = g.player;
    // flee from nearest enemies, seek pickups when safe
    let fx = 0, fy = 0;
    let nearest = 1e9, nx = 0, ny = 0;
    for (const e of g.enemies) {
        if (e.dead) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 190) { fx += dx / d * (190 - d) / 190; fy += dy / d * (190 - d) / 190; }
        if (d < nearest) { nearest = d; nx = dx / d; ny = dy / d; }
    }
    for (const b of g.ebullets) {
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 90) { fx += dx / d * 1.2; fy += dy / d * 1.2; }
    }
    let px = 0, py = 0, pd = 1e9;
    for (const q of g.loot.pickups) {
        const dx = q.sprite.x - p.x, dy = q.sprite.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < pd) { pd = d; px = dx / d; py = dy / d; }
    }
    if (nearest > 120 && pd < 260) { fx += px * 0.9; fy += py * 0.9; }
    let L = Math.hypot(fx, fy);
    if (L < 0.2 && nearest < 130) {           // pincered: slip perpendicular
        fx = -ny; fy = nx; L = 1;
    }
    if (L > 0.05) { g.stick.active = true; g.stick.x = fx / L * 40; g.stick.y = fy / L * 40; }
    else { g.stick.active = false; g.stick.x = 0; g.stick.y = 0; }
    if (nearest < 46) g.__dashTap = true;
}, 120);
'bot installed'`);

const M = `(() => { const gm = window.__game; const g = gm.scene.getScene('Game'); if (!g || g.runTime === undefined) return JSON.stringify({boot:1});
  return JSON.stringify({ t: Math.round(g.runTime), wave: g.director.waveNumber, st: g.director.state, hp: Math.round(g.player.hp),
  lvl: g.level, kills: g.kills, en: g.enemies.length, heap: Math.round(performance.memory?.usedJSHeapSize/1e6||0),
  fps: Math.round(gm.loop.actualFps), b: g.director.budgetLeft, wt: Math.round(g.director.waveTime), hu: g.director.hunting ? 1 : 0, scenes: gm.scene.getScenes(true).map(s=>s.scene.key).join('+') }); })()`;

let sawBoss1 = false, sawBoss2 = false, sawDraft = false, sawEnd = false;
for (let i = 0; i < 95; i++) {
    await sleep(4000);
    const raw = await ev(M);
    if (!raw) { console.log(i, 'eval-timeout'); continue; }
    const m = JSON.parse(raw);
    console.log(i, raw);
    if (m.boot) continue;
    if (!sawDraft && m.scenes.includes('Upgrade')) { sawDraft = true; await shot('bot-draft'); }
    if (!sawBoss1 && m.wave === 7 && m.st === 'active') { sawBoss1 = true; await shot('bot-boss1'); }
    if (!sawBoss2 && m.wave >= 12) { sawBoss2 = true; await shot('bot-boss2'); }
    if (m.scenes.includes('Result')) { sawEnd = true; await shot('bot-result'); break; }
    if (m.hp <= 0) { await shot('bot-death'); }
    if (i === 4) await shot('bot-early');
    if (i === 14) await shot('bot-mid');
    if (i === 30) await shot('bot-late');
}
console.log('--- errors ---');
console.log(errors.slice(0, 15).join('\n') || '(clean)');
await ev('window.__botOn = false');
ws.close();
chrome.on('exit', () => process.exit(0));
chrome.kill('SIGKILL');
setTimeout(() => process.exit(0), 1200);

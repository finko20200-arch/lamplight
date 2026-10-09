/**
 * Final integration check: boots the real build, force-installs every weapon,
 * evolves one, spawns a boss + mob, opens the draft, picks a card — while
 * watching for JS exceptions and object-count sanity.
 */
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const CHROME = '/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9461;
const URL = 'http://127.0.0.1:8124/index.html?renderer=canvas&autostart';

const chrome = spawn(CHROME, ['--headless', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=640,360',
    '--mute-audio', '--no-zygote', `--remote-debugging-port=${PORT}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
const exceptions = [];
chrome.stderr.on('data', d => {
    for (const l of d.toString().split('\n')) {
        if (/CONSOLE/.test(l)) { console.log('[c]', l.replace(/.*CONSOLE[^"]*"/, '').slice(0, 200)); }
        if (/CONSOLE.*error/i.test(l)) { exceptions.push(l.replace(/.*CONSOLE[^"]*"/, '').slice(0, 260)); }
    }
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1600);
let list = null;
for (let i = 0; i < 12 && !list; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) })).json(); }
    catch (e) { await sleep(500); }
}
console.log('targets:', list ? list.length : 'none');
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl, { maxPayload: 1 << 26 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        exceptions.push('[EXC] ' + (d.exception?.description || d.text || '').split('\n').slice(0, 3).join(' | ').slice(0, 300));
    }
});
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
    const r = await Promise.race([send('Runtime.evaluate', { expression, returnByValue: true }), sleep(4000).then(() => null)]);
    return r?.result?.result?.value ?? (r?.result?.exceptionDetails ? 'ERR:' + (r.result.exceptionDetails.exception?.description || '').split('\n')[0] : 'timeout');
};
await send('Page.enable'); await send('Runtime.enable');
const nav = await send('Page.navigate', { url: URL });
console.log('nav result:', JSON.stringify(nav.result || nav).slice(0, 200));
await sleep(1500);
console.log('where:', await ev(`JSON.stringify({href: location.href, ready: document.readyState, hasGame: !!window.__game, scripts: document.scripts.length})`));

// wait for Game
for (let i = 0; i < 30; i++) {
    await sleep(600);
    const v = await ev(`!!(window.__game && window.__game.scene.getScenes(true).some(s=>s.scene.key==='Game'))`);
    if (v === true) break;
}

console.log('step1 weapons:', await ev(`(() => {
    const g = window.__game.scene.getScene('Game');
    ['blades','nova','runes','lance','flasks','whip','boom'].forEach(k => g.addWeapon(k));
    g.passives.power = 5; g.passives.haste = 5; g.passives.area = 5; g.passives.multishot = 2;
    g.weapons.get('sparks').level = 8;
    g.recalcStats();
    return g.weapons.size;
})()`));

console.log('step2 mob+boss:', await ev(`(() => {
    const g = window.__game.scene.getScene('Game');
    for (let i = 0; i < 22; i++) { g.spawnEnemy(g.pickType()); }
    g.spawnBoss(1);
    return g.enemies.length;
})()`));

// let it fight
for (let i = 0; i < 8; i++) {
    await sleep(1500);
    const st = await ev(`(() => { const g = window.__game.scene.getScene('Game');
        return JSON.stringify({ t: Math.round(g.runTime), en: g.enemies.length, shots: g.shots.length,
        zones: g.zones.length, kills: g.kills, lvl: g.level, heap: Math.round(performance.memory?.usedJSHeapSize/1e6||0) }); })()`);
    console.log('tick', i, st);
}

console.log('step3 draft:', await ev(`(() => {
    const gm = window.__game;
    const g = gm.scene.getScene('Game');
    if (gm.scene.isActive('Upgrade')) { gm.scene.getScene('Upgrade').pick(0); return 'picked(existing)'; }
    g.pendingLevels = 0; g.addXp(5000);
    return 'xp';
})()`));
await sleep(1500);
console.log('step4 draft state:', await ev(`(() => {
    const gm = window.__game;
    if (gm.scene.isActive('Upgrade')) { gm.scene.getScene('Upgrade').pick(0); return 'picked'; }
    return 'no-draft:' + gm.scene.getScenes(true).map(s=>s.scene.key).join(',');
})()`));
await sleep(1500);
console.log('step5 evolved weapons:', await ev(`(() => {
    const g = window.__game.scene.getScene('Game');
    return JSON.stringify({ weapons: [...g.weapons.keys()], evolved: [...g.evolved], en: g.enemies.length, kills: g.kills });
})()`));

console.log('--- exceptions ---');
console.log(exceptions.slice(0, 20).join('\n') || '(clean)');
ws.close();
chrome.on('exit', () => process.exit(0));
chrome.kill('SIGKILL');
setTimeout(() => process.exit(0), 1500);

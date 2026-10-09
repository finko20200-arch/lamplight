/** God-mode content validation: boss fights, phases, victory flow. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'shots');
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9521;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const errors=[];
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE.*error/i.test(l)) errors.push(l.replace(/.*CONSOLE[^"]*"/,'').slice(0,240)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1600);
let list=null;
for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errors.push('[EXC] '+(d.exception?.description||d.text||'').split('\n').slice(0,3).join(' | ').slice(0,300));}});
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}));});
const ev=async(e)=> (await Promise.race([send('Runtime.evaluate',{expression:e,returnByValue:true}), sleep(5000).then(()=>null)]))?.result?.result?.value;
const shot=async(n)=>{const r=await Promise.race([send('Page.captureScreenshot',{format:'png'}), sleep(12000).then(()=>null)]); if(r?.result?.data){fs.writeFileSync(path.join(OUT,n+'.png'),Buffer.from(r.result.data,'base64'));console.log('shot',n);}else console.log('shot-miss',n);};
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html?renderer=canvas&autostart&god=1&ts=5'});
await sleep(3500);
await ev(`(() => { const g = window.__game.scene.getScene('Game'); g.addWeapon('blades'); g.addWeapon('nova'); g.addWeapon('lance'); g.passives.power = 4; g.recalcStats(); return 1; })()`);
await ev(`setInterval(() => { const gm = window.__game; if (gm && gm.scene.isActive('Upgrade')) { const u = gm.scene.getScene('Upgrade'); if (u && u.choices) u.pick(Math.floor(Math.random() * u.choices.length)); } }, 300); 'picker on'`);
// jump to boss 1
await ev(`(() => { const g = window.__game.scene.getScene('Game'); g.director.state='breather'; g.director.stateT=0.1; g.director.wave=5; return 1; })()`);
await sleep(4000);
console.log('boss1:', await ev(`(()=>{const g=window.__game.scene.getScene('Game');return JSON.stringify({wave:g.director.waveNumber,boss:!!g.boss,hp:g.boss&&Math.round(g.boss.hp),max:g.boss&&g.boss.maxHp,phase:g.boss&&g.boss.phase,en:g.enemies.length});})()`));
await shot('boss1-fight');
// watch phases
for (let i=0;i<6;i++){ await sleep(4000); console.log('p1 tick', await ev(`(()=>{const g=window.__game.scene.getScene('Game');const b=g.boss;return JSON.stringify({hp:b&&Math.round(b.hp),phase:b&&b.phase,st:b&&b.st.mode,en:g.enemies.length,eb:g.ebullets.length});})()`)); }
// kill boss1 -> wave 8
await ev(`(()=>{const g=window.__game.scene.getScene('Game');if(g.boss)g.boss.damage(g.boss.maxHp*2,{silent:true,source:'test'});return 1;})()`);
await sleep(6000);
console.log('after boss1:', await ev(`(()=>{const g=window.__game.scene.getScene('Game');return JSON.stringify({wave:g.director.waveNumber,state:g.director.state});})()`));
// jump to final
await ev(`(() => { const g = window.__game.scene.getScene('Game'); g.director.state='breather'; g.director.stateT=0.1; g.director.wave=10; g.enemies.slice().forEach(e=>{if(!e.dead)e.damage(999999,{silent:true,source:'test'});}); return 1; })()`);
await sleep(5000);
console.log('boss2:', await ev(`(()=>{const g=window.__game.scene.getScene('Game');return JSON.stringify({wave:g.director.waveNumber,boss:!!g.boss,tier:g.boss&&g.boss.tier,phase:g.boss&&g.boss.phase});})()`));
await shot('boss2-fight');
await ev(`(()=>{const g=window.__game.scene.getScene('Game');if(g.boss)g.boss.damage(g.boss.maxHp*2,{silent:true,source:'test'});g.enemies.slice().forEach(e=>{if(!e.dead)e.damage(999999,{silent:true,source:'test'});});return 1;})()`);
await sleep(7000);
console.log('end:', await ev(`JSON.stringify({scenes:window.__game.scene.getScenes(true).map(s=>s.scene.key)})`));
console.log('dmgStats:', await ev(`(()=>{const r=window.__game.scene.getScene('Result');return r&&r.r?JSON.stringify(r.r.dmgStats):'no-result';})()`));
for (let i=0;i<3;i++){ await shot('boss-victory'); const sz = await ev('1'); await sleep(1500); if (i===0) break; }
console.log('--- errors ---'); console.log(errors.slice(0,12).join('\n') || '(clean)');
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1200);

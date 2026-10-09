import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9531;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const errs=[];
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE.*error/i.test(l)) errs.push(l.replace(/.*CONSOLE[^"]*"/,'').slice(0,240)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1600);
let list=null;
for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errs.push('[EXC] '+(d.exception?.description||d.text||'').split('\n').slice(0,3).join(' | ').slice(0,300));}});
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}));});
const ev=async(e)=> (await Promise.race([send('Runtime.evaluate',{expression:e,returnByValue:true}), sleep(4000).then(()=>null)]))?.result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html?renderer=canvas&autostart'});
await sleep(4000);
console.log('weapons:', await ev(`(() => { const g = window.__game.scene.getScene('Game'); ['whip','boom'].forEach(k => g.addWeapon(k)); g.passives.power = 3; g.recalcStats(); for (let i=0;i<14;i++){ g.spawnEnemy('shade', g.player.x + 60 + i*8, g.player.y + (i%5)*14 - 30); } return [...g.weapons.keys()].join(','); })()`));
for (let i=0;i<6;i++){
  await sleep(1500);
  console.log(i, await ev(`(() => { const g = window.__game.scene.getScene('Game'); const w = g.weapons.get('boom'); return JSON.stringify({ kills: g.kills, en: g.enemies.length, booms: w ? w.booms.length : -1, stats: Object.keys(g.dmgStats) }); })()`));
}
console.log('--- errors ---'); console.log(errs.slice(0,10).join('\n') || '(clean)');
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1200);

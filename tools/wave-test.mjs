import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9491;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE.*(error)/i.test(l)) console.log('[console]', l.replace(/.*CONSOLE[^"]*"/,'').slice(0,240)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1800);
let list=null;
for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;console.log('[EXC]',(d.exception?.description||d.text||'').split('\n').slice(0,8).join(' | ').slice(0,300));}});
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}));});
const ev=async(e)=> (await Promise.race([send('Runtime.evaluate',{expression:e,returnByValue:true}), sleep(4000).then(()=>null)]))?.result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html?renderer=canvas&autostart'});
await sleep(4000);
const D = `(()=>{const g=window.__game.scene.getScene('Game');const d=g.director;return JSON.stringify({wave:d.waveNumber,state:d.state,budget:d.budgetLeft,alive:d.waveAlive,en:g.enemies.length,kills:g.kills});})()`;
console.log('start :', await ev(D));
// clear waves 1..3 by killing everything repeatedly
for (let w=0; w<3; w++) {
  for (let i=0;i<14;i++) {
    await ev(`(()=>{const g=window.__game.scene.getScene('Game');g.enemies.slice().forEach(e=>{if(!e.dead)e.damage(999999,{silent:true,source:'test'});});return 1;})()`);
    await sleep(700);
    const st = JSON.parse(await ev(D));
    if (st.state==='breather' || st.wave > w+1) break;
  }
  console.log(`after clear ${w+1}:`, await ev(D));
}
// close draft if open
await ev(`(()=>{const gm=window.__game;if(gm.scene.isActive('Upgrade')){gm.scene.getScene('Upgrade').pick(0);}return 1;})()`);
await sleep(800);
// jump to final wave
console.log('jump  :', await ev(`(()=>{const g=window.__game.scene.getScene('Game');g.director.state='breather';g.director.stateT=0.1;g.director.wave=10;return 'ok';})()`));
await sleep(2500);
console.log('final :', await ev(D));
await ev(`(()=>{const gm=window.__game;if(gm.scene.isActive('Upgrade')){gm.scene.getScene('Upgrade').pick(0);}return 1;})()`);
console.log('boss  :', await ev(`(()=>{const g=window.__game.scene.getScene('Game');return JSON.stringify({boss:!!g.boss,tier:g.boss&&g.boss.tier});})()`));
// kill boss -> victory
await ev(`(()=>{const g=window.__game.scene.getScene('Game');if(g.boss)g.boss.damage(99999999,{silent:true,source:'test'});g.enemies.slice().forEach(e=>{if(!e.dead)e.damage(999999,{silent:true,source:'test'});});return 1;})()`);
await sleep(6000);
console.log('end   :', await ev(`JSON.stringify({scenes:window.__game.scene.getScenes(true).map(s=>s.scene.key)})`));
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1200);

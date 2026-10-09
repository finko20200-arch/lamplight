import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9541;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1600);
let list=null; for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}));});
const ev=async(e)=> (await Promise.race([send('Runtime.evaluate',{expression:e,returnByValue:true}), sleep(4000).then(()=>null)]))?.result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html?renderer=canvas&autostart'});
await sleep(4000);
console.log(await ev(`(() => {
  const g = window.__game.scene.getScene('Game');
  g.director.state='breather'; g.director.stateT=0.05; g.director.wave=2;   // -> wave 4 next
  return 'set';
})()`));
await sleep(2500);
console.log(await ev(`(() => {
  const g = window.__game.scene.getScene('Game');
  for (let i=0;i<120;i++) g.director.spawnOne();
  const el = g.enemies.filter(e=>e.elite).length;
  const crowns = g.children.list.filter(c=>c.frame&&c.frame.name&&c.frame.name.startsWith('elite_crown')&&c.visible).length;
  return JSON.stringify({wave:g.director.waveNumber, en:g.enemies.length, elites:el, crownsVisible:crowns});
})()`));
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1000);

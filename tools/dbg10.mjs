import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9355;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE|FATAL|ERROR/.test(l) && !/dbus|zygote|vaapi|audio/.test(l)) console.log('[chrome]', l.slice(0,260)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(2200);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);} if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;console.log('[EXC]',(d.exception?.description||d.text||'').split('\n').slice(0,3).join(' | ').slice(0,300));}});
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url: process.argv[2]});
for (let i=0;i<6;i++){
  await sleep(1200);
  const r = await Promise.race([send('Runtime.evaluate',{expression:`(()=>{const gm=window.__game;const g=gm?.scene?.getScene('Game');const u=gm?.scene?.getScene('Upgrade');return JSON.stringify({scenes:gm?gm.scene.getScenes(true).map(s=>s.scene.key):null,rtype:gm?.renderer?.type,t:g&&g.runTime!==undefined?Math.round(g.runTime):null,en:g?g.enemies.length:null,uCh:u?u.children.length:null});})()`,returnByValue:true}), sleep(3000).then(()=>null)]);
  console.log(i, r?.result?.result?.value || 'timeout');
}
ws.close(); chrome.kill(); process.exit(0);

import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9481;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--no-zygote','--autoplay-policy=no-user-gesture-required',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE.*(error|warning)/i.test(l) && !/AudioContext/.test(l)) console.log('[console]', l.replace(/.*CONSOLE[^"]*"/,'').slice(0,200)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1800);
let list=null;
for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;console.log('[EXC]',(d.exception?.description||d.text||'').split('\n')[0]);}});
const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const ev=async(e)=> (await send('Runtime.evaluate',{expression:e,returnByValue:true}))?.result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html'});
await sleep(4000);
console.log('MENU audio:', await ev(`(()=>{const A=window.__lamplight&&window.__lamplight.Audio;return A?JSON.stringify({state:A.ctx&&A.ctx.state,musicOn:A.musicOn,sfxOn:A.sfxOn,intensity:A.intensity,steps:A.stepsScheduled||0,ready:A.ready}):'no-handle';})()`));
await sleep(3000);
console.log('MENU +3s  :', await ev(`JSON.stringify({steps:window.__lamplight.Audio.stepsScheduled||0, ct: +window.__lamplight.Audio.ctx.currentTime.toFixed(1)})`));
// sfx probe
console.log('sfx probe :', await ev(`(()=>{try{window.__lamplight.Audio.play('ui');window.__lamplight.Audio.play('levelup');return 'ok';}catch(e){return 'ERR '+e.message;}})()`));
// go to game
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:320,y:168,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:320,y:168,button:'left',clickCount:1});
await sleep(5000);
console.log('GAME audio:', await ev(`(()=>{const A=window.__lamplight.Audio;const g=window.__game.scene.getScene('Game');return JSON.stringify({steps:A.stepsScheduled||0,intensity:A.intensity,scene:g&&g.scene.key});})()`));
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1200);

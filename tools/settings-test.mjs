import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9551;
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const errs=[];
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE.*error/i.test(l)) errs.push(l.replace(/.*CONSOLE[^"]*"/,'').slice(0,200)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1600);
let list=null; for (let i=0;i<12&&!list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errs.push('[EXC] '+(d.exception?.description||d.text||'').split('\n')[0].slice(0,200));}});
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}));});
const ev=async(e)=> (await Promise.race([send('Runtime.evaluate',{expression:e,returnByValue:true}), sleep(4000).then(()=>null)]))?.result?.result?.value;
const click=async(x,y)=>{ await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1}); await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1}); await sleep(400); };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html'});
await sleep(4500);
console.log('menu:', await ev(`window.__game.scene.getScenes(true).map(s=>s.scene.key).join(',')`));
await click(322, 244);   // НАСТРОЙКИ
console.log('after open:', await ev(`window.__game.scene.getScenes(true).map(s=>s.scene.key).join(',')`));
const before = await ev(`JSON.stringify({m: window.__lamplight.Save.get('music', true), sh: window.__lamplight.Save.get('shake', true)})`);
await click(440, 80);    // music row value zone
await click(440, 176);   // shake row
const after = await ev(`JSON.stringify({m: window.__lamplight.Save.get('music', true), sh: window.__lamplight.Save.get('shake', true)})`);
console.log('settings before:', before, '→ after:', after);
await click(320, 336);   // ЗАКРЫТЬ
console.log('after close:', await ev(`window.__game.scene.getScenes(true).map(s=>s.scene.key).join(',')`));
console.log('--- errors ---'); console.log(errs.slice(0,8).join('\n') || '(clean)');
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1000);

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'shots');
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-handless-shell';
const CHROME_BIN = fs.existsSync('/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell') ? '/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' : CHROME;
const PORT=9471;
const chrome = spawn(CHROME_BIN,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) if (/CONSOLE/.test(l)) console.log('[console]', l.replace(/.*CONSOLE[^"]*"/,'').slice(0,240)); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1800);
let list=null;
for (let i=0;i<12 && !list;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`,{signal:AbortSignal.timeout(2500)})).json(); }catch(e){ await sleep(500);} }
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl,{maxPayload:1<<26});
await new Promise(r=>ws.on('open',r));
let id=0; const pend=new Map();
ws.on('message',raw=>{const m=JSON.parse(raw); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;console.log('[EXC]',(d.exception?.description||d.text||'').split('\n').slice(0,4).join(' | ').slice(0,400));}
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'){console.log('[console.error]', m.params.args.map(a=>a.value||a.description||'').join(' ').slice(0,300));}
});
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'inject-selfload.js'), 'utf8') });
const FILE_URL = 'file://' + path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'release', 'LAMPLIGHT.html');
console.log('nav:', FILE_URL);
await send('Page.navigate',{url:FILE_URL});
await sleep(5000);
// click ИГРАТЬ (button center at 320,168 in 640x360)
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:320,y:168,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:320,y:168,button:'left',clickCount:1});
await sleep(6000);
console.log('state:', await (await Promise.race([send('Runtime.evaluate',{expression:`(()=>{const gm=window.__game;const g=gm&&gm.scene.getScene('Game');return JSON.stringify({scenes:gm?gm.scene.getScenes(true).map(s=>s.scene.key):null,rtype:gm?gm.renderer.type:null,t:g&&g.runTime!==undefined?+g.runTime.toFixed(1):null,children:g?g.children.length:null});})()`,returnByValue:true}), sleep(4000).then(()=>null)]))?.result?.result?.value);
const shot = await Promise.race([send('Page.captureScreenshot',{format:'png'}), sleep(12000).then(()=>null)]);
if (shot?.result?.data) { fs.writeFileSync(path.join(OUT,'file-test.png'), Buffer.from(shot.result.data,'base64')); console.log('shot saved'); } else console.log('no frame');
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1200);

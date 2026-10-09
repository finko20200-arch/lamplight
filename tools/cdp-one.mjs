/** One chrome process per screenshot: name url waitMs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
const [name, url, waitMs, cond] = [process.argv[2], process.argv[3], parseInt(process.argv[4] || '6000', 10), process.argv[5]];
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9400 + Math.floor(Math.random() * 500);
setTimeout(() => { console.log(`✗ ${name} (watchdog)`); try { chrome.kill('SIGKILL'); } catch(e){} process.exit(1); }, waitMs + 60000).unref();
const chrome = spawn(CHROME,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=640,360','--hide-scrollbars','--mute-audio','--no-zygote',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const errs = [];
chrome.stderr.on('data', d => { for (const l of d.toString().split('\n')) { if (/CONSOLE/.test(l)) { const m = l.replace(/.*CONSOLE[^"]*"/,'').slice(0,200); console.log('  console:', m); if (/error|warning/i.test(l)) errs.push(m); } } });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
await sleep(1500);
let list = null;
for (let i = 0; i < 10 && !list; i++) {
  try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) })).json(); }
  catch (e) { await sleep(600); }
}
try {
  if (!list) { throw new Error('devtools not reachable'); }
  const ws = new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl, {maxPayload:1<<26});
  await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let id=0; const pend=new Map();
  ws.on('message', raw=>{ const m=JSON.parse(raw);
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown'){ const d=m.params.exceptionDetails; console.log('  EXCEPTION:', (d.exception?.description||d.text||'').split('\n').slice(0,4).join(' | ').slice(0,400)); }
});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate',{url});
  await sleep(Math.min(2500, waitMs));
  if (cond) {
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      const r = await Promise.race([send('Runtime.evaluate',{expression:cond,returnByValue:true}), sleep(3000).then(()=>null)]);
      if (r?.result?.result?.value === true) break;
      await sleep(400);
    }
    await sleep(1200);
  } else {
    await sleep(waitMs - Math.min(2500, waitMs));
  }
  const r = await Promise.race([send('Page.captureScreenshot',{format:'png'}), sleep(15000).then(()=>null)]);
  if (r?.result?.data) {
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.result.data,'base64'));
    console.log(`✓ ${name}`);
  } else console.log(`✗ ${name} (no frame)`);
  ws.close();
} catch (e) { console.log(`✗ ${name} ${e.message.split('\n')[0]}`); }
if (errs.length) console.log('  console:', errs.slice(0,6).join(' | '));
chrome.on('exit', () => process.exit(0));
chrome.kill('SIGKILL');
setTimeout(()=>process.exit(0), 1500);

import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const CHROME='/tmp/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT=9552;
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
const click=async(x,y)=>{ await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1}); await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1}); await sleep(350); };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:'http://127.0.0.1:8125/index.html'});
await sleep(1000);
await ev(`window.__tapDebug = 1; 1`);
await sleep(4500);
await click(322, 244);
console.log('diag:', await ev(`(() => {
  const st = window.__game.scene.getScene('Settings');
  if (!st) return 'no-settings';
  const zones = st.children.list.filter(c => c.type === 'Zone');
  const im = window.__game.input;
  return JSON.stringify({
    zones: zones.length,
    z0: zones[0] ? { x: zones[0].x, y: zones[0].y, w: zones[0].width, h: zones[0].height, int: !!zones[0].input, enabled: zones[0].input?.enabled } : null,
    inputEnabled: st.input?.enabled,
    candidates: im.manager ? im.manager.getPointer(0).worldX : null
  });
})()`));
// try clicking via game input directly on zone0 center
await ev(`(() => {
  const st = window.__game.scene.getScene('Settings');
  st.input.on('pointerdown', p => console.log('SETTINGS input pointerdown at', Math.round(p.x), Math.round(p.y)));
  st.events.on('update', () => { const p = st.input.activePointer; if (p.justDown) console.log('SETTINGS update justDown', Math.round(p.x), Math.round(p.y)); });
  const me = window.__game.scene.getScene('Menu');
  me.input.on('pointerdown', p => console.log('MENU input pointerdown at', Math.round(p.x), Math.round(p.y)));
  window.__game.input.on('pointerdown', p => console.log('GAME input pointerdown', Math.round(p.x), Math.round(p.y)));
  return 1;
})()`);
await ev(`(() => { const st = window.__game.scene.getScene('Settings'); window.__up = 0; window.__pd = []; st.events.on('update', () => { window.__up++; const p = st.input.activePointer; if (p.isDown && window.__pd.length < 8) window.__pd.push([Math.round(p.x), Math.round(p.y), p.justDown ? 1 : 0, Math.round(p.downTime)]); }); window.__meta = JSON.stringify({ status: st.sys.settings.status, active: st.sys.isActive(), taps: st.taps ? st.taps.list.length : -1 }); return 1; })()`);
await ev(`(() => { window.__wd = 0; window.__cd = 0; window.addEventListener('pointerdown', () => window.__wd++, true); const c = document.querySelector('canvas'); if (c) c.addEventListener('pointerdown', () => window.__cd++, true); return !!c; })()`);
await click(440, 80);
await sleep(500);
console.log('dom counters:', await ev(`JSON.stringify({w: window.__wd, c: window.__cd, canvas: !!document.querySelector('canvas')})`));
console.log('taps list:', await ev(`(() => { const st = window.__game.scene.getScene('Settings'); return st.taps ? JSON.stringify(st.taps.list.map(r=>[Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h)])) : 'no-taps'; })()`));
console.log('manual handle:', await ev(`(() => { const st = window.__game.scene.getScene('Settings'); st.taps.handle(440, 80); return window.__lamplight.Save.get('music', true); })()`));
console.log('update-probe:', await ev(`JSON.stringify({ updates: window.__up, pd: window.__pd, meta: window.__meta })`));
console.log('music mid:', await ev(`window.__lamplight.Save.get('music', true)`));
await click(320, 336);
console.log('music now:', await ev(`window.__lamplight.Save.get('music', true)`));
console.log('scenes:', await ev(`window.__game.scene.getScenes(true).map(s=>s.scene.key).join(',')`));
ws.close(); chrome.on('exit',()=>process.exit(0)); chrome.kill('SIGKILL'); setTimeout(()=>process.exit(0),1000);

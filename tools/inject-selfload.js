(function () {
  const report = (what, url) => {
    try {
      if (url !== undefined && url !== null && (String(url).startsWith('file:') || String(url) === '')) {
        console.log('[SELFLOAD]', what, String(url).slice(0, 120), new Error().stack.split('\n').slice(1, 5).join(' <- '));
      }
    } catch (e) {}
  };
  const of = window.fetch;
  if (of) window.fetch = function (u) { report('fetch', typeof u === 'string' ? u : (u && u.url)); return of.apply(this, arguments); };
  const XO = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { report('xhr', u); return XO.apply(this, arguments); };
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    set(v) { report('img.src', v); d.set.call(this, v); },
    get() { return d.get.call(this); }
  });
  const dl = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
  if (dl) Object.defineProperty(HTMLLinkElement.prototype, 'href', {
    set(v) { report('link.href', v); dl.set.call(this, v); },
    get() { return dl.get.call(this); }
  });
  const ds = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (ds) Object.defineProperty(HTMLScriptElement.prototype, 'src', {
    set(v) { report('script.src', v); ds.set.call(this, v); },
    get() { return ds.get.call(this); }
  });
})();

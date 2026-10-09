/**
 * Build pipeline: esbuild-bundle the game, then inline everything
 * (Phaser 4 + game code + base64 pixel fonts) into ONE self-contained
 * dist/index.html that runs offline, from file://, anywhere.
 */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const t0 = Date.now();

await esbuild.build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    minify: true,
    charset: 'ascii',          // all non-ASCII -> \uXXXX: file survives any re-encoding
    sourcemap: false,
    legalComments: 'none',
    target: ['es2020'],
    format: 'iife',
    outfile: path.join(dist, 'bundle.js'),
    inject: [path.join(root, 'tools/phaser-shim.js')],
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning'
});

const bundle = fs.readFileSync(path.join(dist, 'bundle.js'), 'utf8');

/* ── fonts ── */
const fontsDir = path.join(root, 'tools/fonts');
const fontsIndex = JSON.parse(fs.readFileSync(path.join(fontsDir, 'index.json'), 'utf8'));
const UNICODE = {
    cyrillic: 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
    latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
};
const FAMILY = {
    Press_Start_2P: 'Press Start 2P',
    Pixelify_Sans: 'Pixelify Sans',
    Handjet: 'Handjet'
};
let css = '';
for (const [key, info] of Object.entries(fontsIndex)) {
    const b64 = fs.readFileSync(path.join(root, info.file)).toString('base64');
    const fam = FAMILY[key.replace(/_(cyrillic|latin)_.*$/, '')];
    const subset = info.subset;
    const weight = info.weight.includes('..') ? info.weight : '400';
    css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};font-display:block;` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');` +
        `unicode-range:${UNICODE[subset]};}\n`;
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>LAMPLIGHT &#8212; &#1055;&#1086;&#1089;&#1083;&#1077;&#1076;&#1085;&#1103;&#1103; &#1074;&#1072;&#1093;&#1090;&#1072;</title>
<style>
${css}
html,body{margin:0;padding:0;height:100%;background:#05030a;overflow:hidden;}
body{display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at 50% 40%, #14101f 0%, #05030a 70%);}
#game{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
#game canvas{image-rendering:pixelated;image-rendering:crisp-edges;
  box-shadow:0 0 0 2px #241c3a, 0 0 60px rgba(255,138,43,.12), 0 0 140px rgba(10,7,22,.9);
  touch-action:none;outline:none;}
#boot-fallback{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  color:#ffd98a;font-family:'Press Start 2P',monospace;font-size:12px;text-align:center;padding:20px;}
</style>
</head>
<body>
<div id="game"></div>
<div id="boot-fallback">&#1047;&#1040;&#1046;&#1048;&#1043;&#1040;&#1045;&#1052; &#1060;&#1054;&#1053;&#1040;&#1056;&#1048;&#8230;</div>
<script>
${bundle}
document.getElementById('boot-fallback').remove();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(dist, 'index.html'), html);
const kb = (fs.statSync(path.join(dist, 'index.html')).size / 1024).toFixed(0);
console.log(`✓ dist/index.html (${kb} KB, self-contained) in ${Date.now() - t0} ms`);

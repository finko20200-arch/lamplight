/** Tiny static server for dist/ — `npm run serve`. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 8080);

import net from 'node:net';

function tryListen(server, port) {
    server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && port < 8120) {
            console.log(`port ${port} busy → trying ${port + 1}`);
            tryListen(server, port + 1);
        } else {
            console.error('server error:', err.message);
            process.exit(1);
        }
    });
    server.listen(port, () => console.log(`lamplight dev server → http://127.0.0.1:${port}/`));
}

const server = http.createServer((req, res) => {
    const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
        res.end(data);
    });
});
tryListen(server, port);

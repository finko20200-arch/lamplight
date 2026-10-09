/**
 * Uniform-grid spatial hash. Used for enemy separation and for every
 * "find enemies near a point" query the weapons make — O(neighbourhood)
 * instead of O(n²) with 300+ bodies on screen.
 */
export class SpatialGrid {
    constructor(cell = 48) {
        this.cell = cell;
        this.map = new Map();
    }

    key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }

    clear() { this.map.clear(); }

    insert(obj) {
        const cx = Math.floor(obj.x / this.cell);
        const cy = Math.floor(obj.y / this.cell);
        const k = this.key(cx, cy);
        let list = this.map.get(k);
        if (!list) { list = []; this.map.set(k, list); }
        list.push(obj);
    }

    /** Fill `out` (reused array) with objects within radius r of x,y. */
    query(x, y, r, out) {
        out.length = 0;
        const c0x = Math.floor((x - r) / this.cell), c1x = Math.floor((x + r) / this.cell);
        const c0y = Math.floor((y - r) / this.cell), c1y = Math.floor((y + r) / this.cell);
        const r2 = r * r;
        for (let cy = c0y; cy <= c1y; cy++) {
            for (let cx = c0x; cx <= c1x; cx++) {
                const list = this.map.get(this.key(cx, cy));
                if (!list) { continue; }
                for (let i = 0; i < list.length; i++) {
                    const o = list[i];
                    const dx = o.x - x, dy = o.y - y;
                    if (dx * dx + dy * dy <= r2) { out.push(o); }
                }
            }
        }
        return out;
    }

    /** Nearest object to x,y within r (or null). */
    nearest(x, y, r, filter = null) {
        let best = null, bestD = r * r;
        const found = this.query(x, y, r, SpatialGrid._q || (SpatialGrid._q = []));
        for (let i = 0; i < found.length; i++) {
            const o = found[i];
            if (filter && !filter(o)) { continue; }
            const dx = o.x - x, dy = o.y - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = o; }
        }
        return best;
    }

    /** Up to n nearest objects within r. */
    nearestN(x, y, r, n, filter = null, out = []) {
        out.length = 0;
        const found = this.query(x, y, r, SpatialGrid._q2 || (SpatialGrid._q2 = []));
        for (let i = 0; i < found.length; i++) {
            const o = found[i];
            if (filter && !filter(o)) { continue; }
            const dx = o.x - x, dy = o.y - y;
            o.__d = dx * dx + dy * dy;
            out.push(o);
        }
        out.sort((a, b) => a.__d - b.__d);
        if (out.length > n) { out.length = n; }
        return out;
    }

    /** Densest cluster centre near x,y (for rune placement). */
    densestPoint(x, y, r, sampleR = 60) {
        const found = this.query(x, y, r, SpatialGrid._q3 || (SpatialGrid._q3 = []));
        if (!found.length) { return null; }
        let best = found[0], bestCount = -1;
        for (let i = 0; i < found.length; i += 2) {
            const o = found[i];
            let c = 0;
            for (let j = 0; j < found.length; j++) {
                const dx = found[j].x - o.x, dy = found[j].y - o.y;
                if (dx * dx + dy * dy < sampleR * sampleR) { c++; }
            }
            if (c > bestCount) { bestCount = c; best = o; }
        }
        return best;
    }
}

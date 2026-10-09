/** Persistent meta-progression + settings (localStorage, fail-safe). */

const KEY = 'lamplight.save.v1';

export const DEFAULT_SAVE = {
    gold: 0,
    altar: {},
    stats: { runs: 0, wins: 0, bestTime: 0, bestKills: 0, bestLevel: 0, totalKills: 0, totalGold: 0 },
    flags: { firstWin: false, endlessUnlocked: false },
    settings: { music: true, sfx: true, quality: 'auto', shake: true, showDamage: true }
};

let cache = null;

function read() {
    if (cache) { return cache; }
    try {
        const raw = localStorage.getItem(KEY);
        cache = raw ? deepMerge(structuredClone(DEFAULT_SAVE), JSON.parse(raw)) : structuredClone(DEFAULT_SAVE);
    } catch (e) {
        cache = structuredClone(DEFAULT_SAVE);
    }
    return cache;
}

function deepMerge(base, over) {
    for (const k of Object.keys(over)) {
        if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') {
            deepMerge(base[k], over[k]);
        } else {
            base[k] = over[k];
        }
    }
    return base;
}

export const Save = {
    get data() { return read(); },
    save() {
        try { localStorage.setItem(KEY, JSON.stringify(read())); } catch (e) { /* private mode */ }
    },
    addGold(n) { read().gold += n; this.save(); },
    spendGold(n) {
        if (read().gold < n) { return false; }
        read().gold -= n; this.save(); return true;
    },
    altarLevel(id) { return read().altar[id] || 0; },
    altarSet(id, lvl) { read().altar[id] = lvl; this.save(); },
    /** Read with fallback (never writes). */
    get(k, fallback) {
        const s = read().settings;
        return (k in s) ? s[k] : fallback;
    },
    /** Explicit write. */
    set(k, v) { read().settings[k] = v; this.save(); return v; },
    setting(k, v) {
        if (arguments.length < 2) { return read().settings[k]; }
        read().settings[k] = v; this.save(); return v;
    },
    recordRun({ time, kills, level, gold, won }) {
        const s = read().stats;
        s.runs++;
        if (won) { s.wins++; }
        s.bestTime = Math.max(s.bestTime, time);
        s.bestKills = Math.max(s.bestKills, kills);
        s.bestLevel = Math.max(s.bestLevel, level);
        s.totalKills += kills;
        s.totalGold += gold;
        this.save();
    },
    reset() { cache = structuredClone(DEFAULT_SAVE); this.save(); }
};

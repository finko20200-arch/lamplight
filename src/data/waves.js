import { ENEMIES } from './game.js';

/**
 * WAVE DIRECTOR — the run is now a structured level, not an endless grind.
 *
 * 12 waves: finite enemy budgets, distinct spawn patterns (trickle / ring /
 * line / corners / pincer), breather pauses with rewards, two boss gates.
 * Killing the final boss ends the level (victory). Endless mode (meta unlock)
 * switches to procedurally scaled waves after wave 12.
 */

export const WAVES = [
    { budget: 30, pace: 0.9, types: { shade: 1 }, pattern: 'trickle', label: 'ВОЛНА 1 · Тени проснулись' },
    { budget: 46, pace: 1.2, types: { shade: 3, wisp: 2 }, pattern: 'ring', label: 'ВОЛНА 2 · Огоньки во мгле' },
    { budget: 54, pace: 1.3, types: { shade: 3, wisp: 2, crawler: 3 }, pattern: 'line', label: 'ВОЛНА 3 · Ползёт рой' },
    { budget: 48, pace: 1.15, types: { shade: 3, wisp: 2, crawler: 3 }, pattern: 'corners', label: 'ВОЛНА 4 · Рой с флангов' },
    { budget: 58, pace: 1.35, types: { shade: 3, wisp: 3, crawler: 3, spitter: 2 }, pattern: 'pincer', label: 'ВОЛНА 5 · Клещи' },
    { budget: 74, pace: 1.6, types: { shade: 3, wisp: 2, crawler: 3, spitter: 2, bomber: 2 }, pattern: 'ring', elites: 1, label: 'ВОЛНА 6 · Первые элиты' },
    { boss: 1, adds: 26, pace: 0.5, types: { wisp: 2, shade: 3 }, pattern: 'trickle', label: 'ВОЛНА 7 · ПОЛЫЙ КОРОЛЬ' },
    { budget: 92, pace: 1.9, types: { shade: 3, wisp: 3, crawler: 3, spitter: 2, bomber: 2, husk: 1 }, pattern: 'line', label: 'ВОЛНА 8 · Истуканы' },
    { budget: 90, pace: 1.9, types: { shade: 3, wisp: 3, crawler: 4, spitter: 3, bomber: 2, husk: 2 }, pattern: 'ring', elites: 2, label: 'ВОЛНА 9 · Кольцо смыкается' },
    { budget: 88, pace: 2.0, types: { shade: 3, wisp: 3, crawler: 3, spitter: 3, bomber: 3, husk: 2 }, pattern: 'pincer', elites: 3, label: 'ВОЛНА 10 · Шторм элит' },
    { budget: 100, pace: 2.1, types: { shade: 3, wisp: 3, crawler: 4, spitter: 3, bomber: 3, husk: 3 }, pattern: 'corners', elites: 3, label: 'ВОЛНА 11 · Хаос леса' },
    { boss: 2, adds: 60, pace: 0.8, types: { wisp: 2, shade: 2, crawler: 2, spitter: 1 }, pattern: 'ring', label: 'ВОЛНА 12 · КОРОЛЬ ПРОБУЖДЁН' }
];

export const BREATHER = 10;          // seconds between waves
export const TOTAL_WAVES = WAVES.length;

export class Director {
    constructor(game) {
        this.game = game;
        this.endless = !!game.endless;
        this.wave = -1;              // index into WAVES (or generated endless wave)
        this.state = 'breather';     // 'breather' | 'active' | 'done'
        this.stateT = 2.2;           // intro breather
        this.budgetLeft = 0;
        this.waveAlive = 0;
        this.spawned = 0;
        this.paceAcc = 0;
        this.burstT = 6;
        this.cur = null;             // current wave config
        this.bossRef = null;
    }

    get waveNumber() { return Math.max(1, this.wave + 1); }
    get totalWaves() { return this.endless ? '∞' : TOTAL_WAVES; }

    /** Endless-mode procedural wave after the 12th. */
    genEndless(n) {
        const k = n - TOTAL_WAVES;
        return {
            budget: 120 + k * 18,
            pace: 2.2 + k * 0.12,
            types: { shade: 3, wisp: 3, crawler: 4, spitter: 3, bomber: 3, husk: 2 + Math.floor(k / 3) },
            pattern: ['ring', 'line', 'corners', 'pincer'][k % 4],
            elites: 2 + (k % 3),
            label: `ВОЛНА ${n} · БЕСКОНЕЧНОСТЬ ${k + 1}`
        };
    }

    startWave(idx) {
        this.wave = idx;
        this.cur = (!this.endless && idx < TOTAL_WAVES) ? WAVES[idx]
            : this.genEndless(idx + 1);
        this.state = 'active';
        this.waveTime = 0;
        this.graceT = 3;
        this.pending = [];
        this.hunting = false;
        this.elitesSpawned = 0;
        this.budgetLeft = this.cur.budget || 0;
        this.spawned = 0;
        this.paceAcc = 0;
        this.burstT = 5 + Math.random() * 3;
        this.waveAlive = 0;
        this.game.banner(this.cur.label, this.cur.boss ? 0xd9a7ff : 0xffd98a);
        if (this.cur.boss) {
            this.game.spawnBoss(this.cur.boss);
            this.bossRef = this.game.boss;
        }
        this.game.events.emit('wave:start', this.waveNumber);
    }

    onEnemyGone(e) {
        if (e.wave === this.wave && this.waveAlive > 0) { this.waveAlive--; }
    }

    update(dt) {
        const g = this.game;
        if (this.state === 'done') { return; }

        if (this.state === 'breather') {
            this.stateT -= dt;
            if (this.stateT <= 0) { this.startWave(this.wave + 1); }
            return;
        }

        /* ── active wave ── */
        const cur = this.cur;
        this.waveTime += dt;
        if (this.graceT > 0) { this.graceT -= dt; }

        // stragglers stop kiting: after the budget is spent the wave hunts YOU
        if (!this.hunting && this.budgetLeft <= 0 && this.waveAlive > 0 && this.waveTime > 25) {
            this.hunting = true;
            g.banner('ОНИ ИДУТ ЗА ТОБОЙ', 0xff5470);
        }
        // absolute anti-stall: dissolve the last stragglers
        if (this.budgetLeft <= 0 && this.waveTime > 75 && this.waveAlive > 0 && !cur.boss) {
            for (const e of g.enemies) {
                if (!e.dead && e.wave === this.wave) {
                    g.fx.death(e.x, e.y, e.type, false);
                    this.onEnemyGone(e);
                    e.release();
                }
            }
        }

        // concurrent pressure cap keeps fights readable
        const cap = 30 + this.waveNumber * 4;
        const overCap = g.enemies.length >= cap;

        // paced trickle spawning until budget is spent
        if (this.budgetLeft > 0 && !overCap && this.graceT <= 0) {
            this.paceAcc += cur.pace * dt;
            while (this.paceAcc >= 1 && this.budgetLeft > 0) {
                this.paceAcc -= 1;
                this.spawnOne();
            }
            // pattern bursts while the budget lasts
            this.burstT -= dt;
            if (this.burstT <= 0 && !overCap) {
                this.burstT = 10 + Math.random() * 4;
                const n = Math.min(this.budgetLeft, cur.pattern === 'corners' ? 8 : 4 + this.waveNumber);
                if (n >= 6) {
                    this.spawnBurst(Math.ceil(n / 2), cur.pattern);
                    this.pending.push({ t: 1.6, n: Math.floor(n / 2), pattern: cur.pattern });
                } else {
                    this.spawnBurst(n, cur.pattern);
                }
            }
            for (let i = this.pending.length - 1; i >= 0; i--) {
                this.pending[i].t -= dt;
                if (this.pending[i].t <= 0) {
                    const q = this.pending.splice(i, 1)[0];
                    this.spawnBurst(Math.min(q.n, this.budgetLeft), q.pattern);
                }
            }
        } else if (cur.boss) {
            // boss wave: finite adds trickle while the king lives
            if (this.bossRef && !this.bossRef.dead) {
                this.paceAcc += cur.pace * dt;
                if (this.paceAcc >= 1 && g.enemies.length < 90) {
                    this.paceAcc = 0;
                    this.spawnOne(true);
                }
                if (this.bossRef.hp < this.bossRef.maxHp * 0.5) {
                    this.paceAcc += cur.pace * 0.6 * dt;
                }
            }
        }

        // wave clear conditions
        const cleared = cur.boss
            ? (this.bossRef && this.bossRef.dead && this.waveAlive <= 0)
            : (this.budgetLeft <= 0 && this.waveAlive <= 0);

        if (cleared) {
            if (!this.endless && this.wave >= TOTAL_WAVES - 1) {
                this.state = 'done';
                g.finish(true);
                return;
            }
            this.state = 'breather';
            this.stateT = BREATHER;
            g.onWaveCleared(this.waveNumber);
        }
    }

    pickType() {
        const types = this.cur.types;
        let total = 0;
        for (const k in types) {
            if (ENEMIES[k].unlock <= this.game.runTime) { total += types[k]; }
        }
        if (total <= 0) { return 'shade'; }
        let r = Math.random() * total;
        for (const k in types) {
            if (ENEMIES[k].unlock > this.game.runTime) { continue; }
            r -= types[k];
            if (r <= 0) { return k; }
        }
        return 'shade';
    }

    spawnOne(isAdd = false) {
        const g = this.game;
        if (g.enemies.length >= g.maxAlive) { return; }
        const type = isAdd ? this.pickType() : this.pickType();
        const elite = this.rollElite();
        const e = g.spawnEnemy(type, undefined, undefined, elite);
        if (e) {
            e.wave = this.wave;
            this.budgetLeft = Math.max(0, this.budgetLeft - (elite ? 3 : 1));
            this.waveAlive++;
            this.spawned++;
        }
    }

    rollElite() {
        const cap = this.cur.elites || 0;
        if (this.waveNumber < 5) { return false; }
        if (cap && this.elitesSpawned >= cap) { return false; }
        const chance = Math.min(0.06, 0.012 + this.waveNumber * 0.004);
        if (Math.random() < chance) {
            this.elitesSpawned = (this.elitesSpawned || 0) + 1;
            return true;
        }
        return false;
    }

    /** Patterned burst spawn around the player. */
    spawnBurst(n, pattern) {
        const g = this.game;
        const p = g.player;
        const R = 380;
        const put = (a, d, type, elite) => {
            const e = g.spawnEnemy(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.72, elite);
            if (e) {
                e.wave = this.wave;
                this.budgetLeft = Math.max(0, this.budgetLeft - (elite ? 3 : 1));
                this.waveAlive++;
                this.spawned++;
            }
        };
        switch (pattern) {
            case 'ring': {
                const a0 = Math.random() * 6.283;
                for (let i = 0; i < n; i++) { put(a0 + (i / n) * 6.283, R, this.pickType()); }
                break;
            }
            case 'line': {
                const a = Math.random() * 6.283;
                for (let i = 0; i < n; i++) {
                    const off = (i - n / 2) * 26;
                    put(a, R + (i % 3) * 30, this.pickType());
                    // shift along the perpendicular for a wall shape
                    const e = g.enemies[g.enemies.length - 1];
                    if (e && e.active) { e.x += Math.cos(a + 1.5708) * off; e.y += Math.sin(a + 1.5708) * off * 0.72; }
                }
                break;
            }
            case 'corners': {
                for (let i = 0; i < n; i++) {
                    const a = (Math.floor(i / Math.ceil(n / 4)) % 4) * 1.5708 + 0.7854 + (Math.random() - 0.5) * 0.5;
                    put(a, R * 1.05, this.pickType());
                }
                break;
            }
            case 'pincer': {
                const a = Math.random() * 6.283;
                for (let i = 0; i < n; i++) {
                    put(i % 2 ? a : a + 3.1416, R * (1.25 + (i % 3) * 0.1) + (Math.random() - 0.5) * 60, this.pickType());
                }
                break;
            }
            default: { // trickle
                for (let i = 0; i < n; i++) { put(Math.random() * 6.283, R * (0.85 + Math.random() * 0.3), this.pickType()); }
            }
        }
    }
}

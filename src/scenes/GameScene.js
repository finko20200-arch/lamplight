import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { FxSystem } from '../systems/Fx.js';
import { DamageNumbers } from '../systems/DamageNumbers.js';
import { LootSystem } from '../systems/Loot.js';
import { SpatialGrid } from '../systems/SpatialGrid.js';
import { HUD } from '../systems/HUD.js';
import { makeWeapon } from '../systems/Weapons.js';
import { rollChoices, applyChoice } from '../systems/UpgradeSystem.js';
import { EventBus, EV } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';
import { Save } from '../core/Save.js';
import { Platform } from '../core/Platform.js';
import {
    RUN, PLAYER, ENEMIES, xpForLevel, hpCurve, ALTAR
} from '../data/game.js';
import { Director, TOTAL_WAVES } from '../data/waves.js';

const VW = 640, VH = 360;
const CHUNK = 320;

const PROPS = [
    { key: 'tree_dead', w: 8 }, { key: 'pine', w: 7 }, { key: 'rock_big', w: 5 },
    { key: 'rock_small', w: 6 }, { key: 'pebble', w: 6 }, { key: 'mushrooms', w: 3 },
    { key: 'grave', w: 3 }, { key: 'lantern_post', w: 2.4 }, { key: 'bones', w: 1.6 },
    { key: 'bush', w: 6 }, { key: 'stump', w: 3 }, { key: 'log', w: 3 },
    { key: 'crystal', w: 1.6 }, { key: 'pillar', w: 1.4 }, { key: 'candles', w: 1.6 },
    { key: 'grass', w: 9 }, { key: 'flower', w: 4 }, { key: 'fence', w: 2 }, { key: 'puddle', w: 4 }
];
const PROP_TOTAL_W = PROPS.reduce((a, p) => a + p.w, 0);
const SOLID_PROPS = new Set(['tree_dead', 'pine', 'rock_big', 'rock_small', 'stump', 'log', 'pillar', 'grave', 'lantern_post', 'fence', 'crystal']);
const LIGHT_PROPS = {
    lantern_post: { tint: 0xff8a2b, scale: 3.4, dy: -26, alpha: 0.32 },
    candles: { tint: 0xff9a3c, scale: 2.0, dy: -8, alpha: 0.26 },
    crystal: { tint: 0xa45cff, scale: 2.6, dy: -10, alpha: 0.26 },
    mushrooms: { tint: 0x2f8fa8, scale: 1.3, dy: -6, alpha: 0.12 }
};

/**
 * The run itself: world streaming, director, combat resolution, juice.
 */
export class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) {
        this.runSeed = (data && data.seed) || String(Date.now());
        this.endless = !!(data && data.endless);
    }

    create() {
        this.budgets = Platform.budgets();
        this.decals = [];
        this.enemies = [];
        this.shots = [];
        this.ebullets = [];
        this.zones = [];
        this.lights = [];
        this.chunks = new Map();
        this.solids = null;
        this.enemyPool = [];
        this.shotPool = [];
        this.bulletPool = [];

        this.runTime = 0;
        this.kills = 0;
        this.dmgStats = {};
        this.level = 1;
        this.xpCur = 0;
        this.xpNext = xpForLevel(1);
        this.pendingLevels = 0;
        this.endless = !!this.endless;
        this.weapons = new Map();
        this.passives = {};
        this.evolved = new Set();
        this.rerolls = 1;
        this.maxAlive = this.budgets.maxAlive;
        this.revives = Save.altarLevel('a_revive');
        this.hitstop = 0;
        this.over = false;
        this.boss = null;
        this.rnd = new Phaser.Math.RandomDataGenerator([this.runSeed]);

        /* ── world layers ── */
        this.ground = this.add.tileSprite(VW / 2, VH / 2, VW + 64, VH + 64, 'ground')
            .setScrollFactor(0).setDepth(0).setOrigin(0.5);

        /* ── systems ── */
        this.director = new Director(this);
        this.fx = new FxSystem(this);
        this.dmg = new DamageNumbers(this);
        this.loot = new LootSystem(this);
        this.grid = new SpatialGrid(48);
        this.hud = new HUD(this);
        this.solids = this.physics.add.staticGroup();
        /* ── player ── */
        this.player = new Player(this, 0, 0);
        this.recalcStats();
        this.player.hp = this.player.maxHp;
        this.addWeapon('sparks');
        if (Save.altarLevel('a_start') > 0) {
            const pool = ['blades', 'nova', 'lance', 'flasks', 'runes'];
            this.addWeapon(pool[Math.floor(Math.random() * pool.length)]);
        }
        this.hud.setWeaponTray([...this.weapons.keys()]);
        this.hud.refreshWeaponPips(this);
        this.hud.setPassiveTray(Object.entries(this.passives));

        /* ── darkness + dawn ── */
        this.darkness = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x0a0716, 0.47)
            .setScrollFactor(0).setDepth(8000);

        /* ── fog ── */
        this.fogs = [];
        for (let i = 0; i < this.budgets.fog; i++) {
            const f = this.add.sprite(this.rnd.realInRange(0, VW), this.rnd.realInRange(0, VH), 'atlas', 'fog_puff_0')
                .setScrollFactor(0).setDepth(12500).setAlpha(0.05 + this.rnd.frac() * 0.04)
                .setBlendMode(Phaser.BlendModes.SCREEN).setScale(2 + this.rnd.frac() * 2)
                .setTint(0x3a3350);
            f.play('fog_puff');
            f.__v = { x: this.rnd.realInRange(-6, 6), y: this.rnd.realInRange(-2, 2) };
            this.fogs.push(f);
        }

        this.physics.add.collider(this.player, this.solids);

        /* ── camera ── */
        const cam = this.cameras.main;
        cam.setBackgroundColor('#0a0714');
        cam.startFollow(this.player, true, 0.09, 0.09);
        cam.setRoundPixels(true);

        /* ── input ── */
        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ESC,M');
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.over) { return; }
            if (this.scene.isActive('Pause')) { return; }
            this.pauseGame();
        });
        this.input.keyboard.on('keydown-M', () => {
            const on = !Save.get('music', true);
            Save.setting('music', on);
            Audio.setMusic(on);
        });
        this.hud.pauseBtn.on('pointerdown', () => this.pauseGame());

        /* ── touch controls: floating stick + dash button ── */
        this.isTouch = Platform.touch;
        this.stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: -1 };
        if (this.isTouch) {
            this.stickBase = this.add.image(0, 0, 'atlas', 'soft_glow').setTint(0x241c3a)
                .setScrollFactor(0).setDepth(20001).setScale(2.6).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL);
            this.stickKnob = this.add.image(0, 0, 'atlas', 'soft_glow').setTint(0x9d8ac4)
                .setScrollFactor(0).setDepth(20001).setScale(1.1).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL);
            this.dashBtn = this.add.image(VW - 42, VH - 46, 'atlas', 'ic_dash').setScrollFactor(0)
                .setDepth(20003).setScale(1.5).setAlpha(0.8);
            this.dashBtnRing = this.add.image(VW - 42, VH - 46, 'atlas', 'soft_glow').setTint(0x241c3a)
                .setScrollFactor(0).setDepth(20002).setScale(2.4).setAlpha(0.85).setBlendMode(Phaser.BlendModes.NORMAL);
            this.dashZone = this.add.zone(VW - 42, VH - 46, 64, 64).setScrollFactor(0).setDepth(20004).setInteractive();
            this.dashZone.on('pointerdown', () => { this.__dashTap = true; this.dashBtn.setAlpha(0.4); });
            this.dashZone.on('pointerup', () => this.dashBtn.setAlpha(0.8));
        }
        this.input.on('pointerdown', (p) => {
            if (!this.isTouch || this.stick.active) { return; }
            if (p.x > VW * 0.62) { this.__dashTap = true; return; }
            this.stick.active = true; this.stick.ox = p.x; this.stick.oy = p.y; this.stick.id = p.id;
            if (this.stickBase) {
                this.stickBase.setPosition(p.x, p.y).setAlpha(0.55);
                this.stickKnob.setPosition(p.x, p.y).setAlpha(0.8);
            }
        });
        this.input.on('pointermove', (p) => {
            if (this.stick.active && p.id === this.stick.id) {
                let sx = Phaser.Math.Clamp(p.x - this.stick.ox, -44, 44);
                let sy = Phaser.Math.Clamp(p.y - this.stick.oy, -44, 44);
                if (Math.hypot(sx, sy) < 7) { sx = 0; sy = 0; }     // deadzone
                this.stick.x = sx; this.stick.y = sy;
                if (this.stickKnob) { this.stickKnob.setPosition(this.stick.ox + sx, this.stick.oy + sy); }
            }
        });
        this.input.on('pointerup', (p) => {
            if (p.id === this.stick.id) {
                this.stick.active = false; this.stick.x = 0; this.stick.y = 0;
                if (this.stickBase) { this.stickBase.setAlpha(0); this.stickKnob.setAlpha(0); }
            }
        });

        /* ── post-processing ── */
        if (!location.search.includes('nopost')) { this.setupPost(); }

        /* ── events ── */
        this.onEnemyKilled = (e) => {
            this.kills++;
            this.director.onEnemyGone(e);
            if (e.boss) {
                this.hud.hideBoss();
                this.hitstop = 0.35;
                this.fx.flash(255, 230, 190, 0.5, 400);
                this.banner('КОРОЛЬ ПОВЕРЖЕН', 0xffd98a);
                if (e.tier === 1) { this.runTime = Math.max(this.runTime, 305); }
            }
        };
        EventBus.on(EV.ENEMY_KILLED, this.onEnemyKilled);
        this.events.once('shutdown', () => this.teardown());

        /* ── first chunks & intro ── */
        this.noChunks = location.search.includes('nochunks');
        if (!this.noChunks) { this.ensureChunks(); }
        this.banner(this.endless ? 'БЕСКОНЕЧНАЯ ВАХТА' : `ЦЕЛЬ: ${TOTAL_WAVES} ВОЛН И КОРОЛЬ`, 0xffd98a);
        if (this.highQuality) { this.time.delayedCall(1500, () => this.banner('ПОСТ-FX АКТИВЕН', 0x8ee6ff)); }
        this.time.delayedCall(2600, () => this.banner('ВЫСТОЙ ВО ТЬМЕ', 0x8ee6ff));

        /* ── debug staging (QA / screenshots) ── */
        const q = new URLSearchParams(location.search);
        if (q.has('time')) { this.runTime = parseFloat(q.get('time')); }
        if (q.has('god')) { this.godMode = true; this.player.invuln = 999999; }
        if (q.has('ts')) { this.timeScale = parseFloat(q.get('ts')); }
        if (q.has('spawn')) {
            const n = parseInt(q.get('spawn'), 10);
            this.time.delayedCall(600, () => { for (let i = 0; i < n; i++) { this.spawnEnemy(this.pickType()); } });
        }
        if (q.has('boss')) { this.time.delayedCall(900, () => this.spawnBoss(parseInt(q.get('boss'), 10) || 1)); }
        if (q.has('levelup')) { this.time.delayedCall(1200, () => this.addXp(50)); }
        if (q.has('w')) { const ws = q.get('w').split(','); this.time.delayedCall(300, () => ws.forEach(k => this.addWeapon(k))); }
        if (q.has('pause')) { this.time.delayedCall(1500, () => this.pauseGame()); }
        if (q.has('die')) { this.time.delayedCall(1200, () => { this.revives = 0; this.player.hurt(99999, this.player.x + 5, this.player.y); }); }

        Audio.setIntensity(0);
        this.ctx = { player: this.player, grid: this.grid, game: this, scene: this, enemies: this.enemies, get stats() { return this.game.playerStats; }, spawnSpit: (x, y, nx, ny, dmg) => this.spawnSpit(x, y, nx, ny, dmg), spawnBossOrb: (x, y, nx, ny, dmg) => this.spawnBossOrb(x, y, nx, ny, dmg), summon: (x, y, t) => this.spawnEnemy(t, x, y) };
    }

    /* ═══ setup helpers ═══ */

    setupPost() {
        // Sprite-based cinematic layer: works on EVERY renderer and driver
        // (camera Filters black-screened on several GPUs, so they are gone).
        const qParam = new URLSearchParams(location.search).get('postfx');
        const on = qParam !== null ? qParam === '1' : !!Save.get('postfx', false);
        this.highQuality = on;
        this.glowBoost = on ? 1.3 : 1;
        if (!on) { return; }
        this.vignette = this.add.image(VW / 2, VH / 2, 'vignette')
            .setScrollFactor(0).setDepth(12600).setAlpha(0.9)
            .setBlendMode(Phaser.BlendModes.MULTIPLY).setDisplaySize(VW, VH);
        this.grade = this.add.rectangle(VW / 2, VH / 2, VW + 80, VH + 80, 0x2a3550, 0.07)
            .setScrollFactor(0).setDepth(7900).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    recalcStats() {
        const p = this.passives;
        const a = (id) => Save.altarLevel(id);
        const s = {
            dmg: 1 + (p.power || 0) * 0.08 + a('a_dmg') * ALTAR.a_dmg.per,
            atkSpeed: 1 + (p.haste || 0) * 0.08,
            cdMul: Math.max(0.45, 1 - (p.cooldown || 0) * 0.07),
            area: 1 + (p.area || 0) * 0.08,
            speedMul: (1 + (p.speed || 0) * 0.06) * (1 + a('a_speed') * ALTAR.a_speed.per),
            speed: PLAYER.speed * (1 + (p.speed || 0) * 0.06) * (1 + a('a_speed') * ALTAR.a_speed.per),
            pickup: PLAYER.pickupRadius * (1 + (p.magnet || 0) * 0.18),
            critChance: (p.crit || 0) * 0.05 + a('a_luck') * 0.01,
            critMul: 2 + (p.crit || 0) * 0.25,
            proj: (p.multishot || 0),
            greed: (p.greed || 0) * 0.12,
            goldMul: a('a_gold') * ALTAR.a_gold.per,
            luck: a('a_luck') * ALTAR.a_luck.per,
            regen: (p.vitality || 0) * 0.2 + a('a_regen') * ALTAR.a_regen.per,
            dashMul: Math.max(0.5, 1 - a('a_dash') * ALTAR.a_dash.per),
            bossDmg: a('a_boss') * ALTAR.a_boss.per,
            cards: 4 + a('a_card')
        };
        this.playerStats = s;
        if (this.player) {
            const newMax = PLAYER.hp + (p.vitality || 0) * 14 + a('a_hp') * ALTAR.a_hp.per;
            const diff = newMax - this.player.maxHp;
            this.player.maxHp = newMax;
            if (diff > 0) { this.player.hp += diff; }
            this.player.hp = Math.min(this.player.hp, this.player.maxHp);
            this.player.regen = s.regen;
        }
    }

    rollCrit() { return Math.random() < (this.playerStats?.critChance || 0); }

    addDmgStat(source, amount) {
        if (!source) { return; }
        this.dmgStats[source] = (this.dmgStats[source] || 0) + amount;
    }

    addWeapon(key, level = 1) {
        const w = makeWeapon(this, key);
        w.level = level;
        this.weapons.set(key, w);
        w.onLevel?.();
        this.hud.setWeaponTray([...this.weapons.keys()]);
        this.hud.refreshWeaponPips(this);
        return w;
    }

    banner(text, color) { this.hud.banner(text, color); }

    /* ═══ spawning ═══ */

    pickType() {
        let total = 0;
        const opts = [];
        for (const k in ENEMIES) {
            const c = ENEMIES[k];
            if (k === 'boss' || c.unlock > this.runTime) { continue; }
            opts.push([k, c.weight]);
            total += c.weight;
        }
        let r = Math.random() * total;
        for (const [k, w] of opts) { r -= w; if (r <= 0) { return k; } }
        return 'shade';
    }

    spawnEnemy(type, x, y, forceElite = false) {
        if (this.enemies.length >= this.maxAlive) { return null; }
        if (x === undefined) {
            const a = Math.random() * Math.PI * 2;
            const d = 400 + Math.random() * 120;
            x = this.player.x + Math.cos(a) * d;
            y = this.player.y + Math.sin(a) * d * 0.7;
        }
        let e = this.enemyPool.pop();
        if (!e) { e = new Enemy(this, x, y); }
        const eliteChance = this.runTime > RUN.eliteAfter
            ? Math.min(RUN.eliteChanceMax, RUN.eliteChanceBase + this.runTime / 600 * 0.1)
            : 0;
        const elite = forceElite || Math.random() < eliteChance;
        e.spawn(type, x, y, { hpMul: hpCurve(this.runTime), elite });
        this.enemies.push(e);
        return e;
    }

    spawnBoss(tier) {
        const cam = this.cameras.main;
        const b = new Boss(this, 0, 0);
        b.spawn(tier, this.player.x + 260, this.player.y - 140, hpCurve(this.runTime) * 1.25);
        this.boss = b;
        this.enemies.push(b);
        this.hud.setBoss(tier === 2 ? 'ПОЛЫЙ КОРОЛЬ · ПРОБУЖДЕНИЕ' : 'ПОЛЫЙ КОРОЛЬ');
        this.banner('ПОЛЫЙ КОРОЛЬ ПРОБУДИЛСЯ', 0xd9a7ff);
        this.fx.shake(8, 500);
        Audio.play('boss');
        Audio.setIntensity(3);
        EventBus.emit(EV.BOSS_SPAWNED, b);
    }

    spawnSpit(x, y, nx, ny, dmg) {
        let b = this.bulletPool.pop();
        if (!b) {
            b = this.add.sprite(0, 0, 'atlas', 'spit_0');
            b.play('spit');
        }
        b.setActive(true).setVisible(true).setPosition(x, y).setDepth(9000);
        b.__vx = nx * 150; b.__vy = ny * 150; b.__dmg = dmg; b.__life = 3.4; b.__r = 6;
        this.ebullets.push(b);
        Audio.play('spit');
    }

    spawnBossOrb(x, y, nx, ny, dmg) {
        let b = this.bulletPool.pop();
        if (!b) {
            b = this.add.sprite(0, 0, 'atlas', 'boss_orb_0');
            b.play('boss_orb');
        }
        b.setActive(true).setVisible(true).setPosition(x, y).setDepth(9000).setScale(0.8);
        b.__vx = nx * 150; b.__vy = ny * 150; b.__dmg = dmg; b.__life = 5; b.__r = 9;
        this.ebullets.push(b);
    }

    clearEnemyBullets() {
        for (const b of this.ebullets) { b.setActive(false).setVisible(false); this.bulletPool.push(b); }
        this.ebullets.length = 0;
    }

    /* ═══ shots ═══ */

    spawnShot(o) {
        let s = this.shotPool.pop();
        if (!s) { s = this.add.sprite(0, 0, 'atlas', 'spark_0'); }
        const anims = { spark: 'spark', lance: 'lance', flask: 'flask_proj' };
        s.setActive(true).setVisible(true);
        s.play(anims[o.kind] || 'spark');
        s.setPosition(o.x, o.y);
        s.setDepth(9000);
        s.setScale(o.kind === 'lance' ? 1 : 1);
        s.setAlpha(1);
        s.clearTint();
        s.setBlendMode(o.kind === 'lance' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
        s.__o = o;
        s.__hit = s.__hit || new Set();
        s.__hit.clear();
        if (o.angle !== undefined) { s.setAngle(o.angle); }
        this.shots.push(s);
        return s;
    }

    releaseShot(s, i) {
        s.setActive(false).setVisible(false);
        this.shots.splice(i, 1);
        this.shotPool.push(s);
    }

    updateShots(dt) {
        for (let i = this.shots.length - 1; i >= 0; i--) {
            const s = this.shots[i];
            const o = s.__o;
            o.life -= dt;

            if (o.homing) {
                if (!o.target || o.target.dead) {
                    o.target = this.grid.nearest(s.x, s.y, 420, e => !e.dead);
                }
                if (o.target) {
                    const dx = o.target.x - s.x, dy = o.target.y - s.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const cur = Math.atan2(o.vy, o.vx);
                    const want = Math.atan2(dy, dx);
                    let diff = want - cur;
                    while (diff > Math.PI) { diff -= 6.283; }
                    while (diff < -Math.PI) { diff += 6.283; }
                    const turn = Phaser.Math.Clamp(diff, -o.homing * dt, o.homing * dt);
                    const sp = Math.hypot(o.vx, o.vy);
                    const na = cur + turn;
                    o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp;
                }
                s.setAngle(Math.atan2(o.vy, o.vx) * 57.2958);
            }
            if (o.kind === 'flask') {
                const t = 1 - Math.max(0, o.life) / 1.4;
                s.setScale(1 + Math.sin(t * Math.PI) * 0.5);
                s.setAngle(s.angle + 240 * dt);
            }

            s.x += o.vx * dt;
            s.y += o.vy * dt;

            // hit detection
            const near = this.grid.query(s.x, s.y, o.radius + 12, GameScene._q || (GameScene._q = []));
            for (const e of near) {
                if (e.dead || s.__hit.has(e)) { continue; }
                const rr = o.radius + e.radius;
                const dx = e.x - s.x, dy = e.y - s.y;
                if (dx * dx + dy * dy > rr * rr) { continue; }
                s.__hit.add(e);
                e.damage(o.dmg, {
                    crit: this.rollCrit(), slow: o.slow, burn: o.burn, source: o.src,
                    knock: o.kind === 'lance' ? 40 : 60,
                    kx: o.vx / (Math.hypot(o.vx, o.vy) || 1), ky: o.vy / (Math.hypot(o.vx, o.vy) || 1)
                });
                if (o.slow) { this.fx.frostBurst(e.x, e.y); }
                if (o.pierce-- <= 0) { o.life = 0; break; }
            }

            if (o.life <= 0) {
                if (o.onExpire) { o.onExpire(s); }
                else if (o.kind === 'spark') { this.fx.hitSpark(s.x, s.y, false); }
                this.releaseShot(s, i);
            }
        }
    }

    /* ═══ zones ═══ */

    addZone(o) {
        const sprite = o.kind === 'fire'
            ? this.fx.make('fire_patch_0', o.x, o.y, { depth: 1250, anim: 'fire_patch', scale: (o.radius * 2) / 32 })
            : this.fx.make('rune_sigil_0', o.x, o.y, { depth: 1240, anim: 'rune_sigil', scale: (o.radius * 2) / 44, blend: Phaser.BlendModes.ADD, alpha: 0.95 });
        const light = this.addLight(o.x, o.y, o.kind === 'fire' ? 0xff8a2b : 0xa45cff, o.radius * 0.16, 0.35);
        o.sprite = sprite;
        o.light = light;
        o.t = 0;
        o.tick = 0;
        o.dead = false;
        this.zones.push(o);
        return o;
    }

    updateZones(dt) {
        for (let i = this.zones.length - 1; i >= 0; i--) {
            const z = this.zones[i];
            z.t += dt;
            if (z.t >= z.dur) {
                z.sprite.destroy();
                this.removeLight(z.light);
                this.zones.splice(i, 1);
                continue;
            }
            if (z.t > z.dur - 0.6) { z.sprite.setAlpha((z.dur - z.t) / 0.6); }
            z.tick -= dt;
            if (z.tick <= 0) {
                z.tick = 0.25;
                const near = this.grid.query(z.x, z.y, z.radius, GameScene._q2 || (GameScene._q2 = []));
                for (const e of near) {
                    if (e.dead) { continue; }
                    e.damage(z.dps * 0.25, { silent: true, slow: z.slow, source: z.kind });
                    if (Math.random() < 0.12) {
                        this.dmg.show(Math.round(z.dps * 0.25), e.x, e.y - 10, 'hit');
                    }
                }
            }
        }
    }

    /* ═══ lights (fake volumetric pools) ═══ */

    addLight(x, y, tint, scale, alpha) {
        if (this.lights.length > this.budgets.lights) { return null; }
        const s = this.add.image(x, y, 'atlas', 'soft_glow')
            .setDepth(12100).setBlendMode(Phaser.BlendModes.ADD)
            .setTint(tint).setScale(scale).setAlpha(alpha);
        this.lights.push(s);
        return s;
    }

    removeLight(l) {
        if (!l) { return; }
        const i = this.lights.indexOf(l);
        if (i >= 0) { this.lights.splice(i, 1); }
        l.destroy();
    }

    /* ═══ chunk streaming ═══ */

    chunkKey(cx, cy) { return cx + ',' + cy; }

    ensureChunks() {
        const cam = this.cameras.main;
        const wx = cam.scrollX + VW / 2, wy = cam.scrollY + VH / 2;
        // build window: view + 1 chunk margin
        const c0x = Math.floor((wx - VW / 2) / CHUNK) - 1, c1x = Math.floor((wx + VW / 2) / CHUNK) + 1;
        const c0y = Math.floor((wy - VH / 2) / CHUNK) - 1, c1y = Math.floor((wy + VH / 2) / CHUNK) + 1;
        for (let cy = c0y; cy <= c1y; cy++) {
            for (let cx = c0x; cx <= c1x; cx++) {
                const k = this.chunkKey(cx, cy);
                if (!this.chunks.has(k)) { this.chunkBuilds = (this.chunkBuilds || 0) + 1; this.buildChunk(cx, cy, k); }
            }
        }
        // unload window: one chunk beyond the build window (hysteresis, no churn)
        for (const [k, list] of this.chunks) {
            const [cx, cy] = k.split(',').map(Number);
            if (cx < c0x - 1 || cx > c1x + 1 || cy < c0y - 1 || cy > c1y + 1) {
                for (const o of list) {
                    if (o.light) { this.removeLight(o.light); }
                    o.sprite.destroy();
                }
                this.chunks.delete(k);
            }
        }
    }

    buildChunk(cx, cy, key) {
        const rnd = new Phaser.Math.RandomDataGenerator([key, this.runSeed]);
        const list = [];
        if (location.search.includes('noprops')) { this.chunks.set(key, list); return; }
        const FEW = location.search.includes('fewprops');
        const NODEPTH = location.search.includes('nodepth');
        const n = FEW ? 1 : Math.round((4 + Math.floor(rnd.frac() * 4)) * this.budgets.propDensity);
        for (let i = 0; i < n; i++) {
            let r = rnd.frac() * PROP_TOTAL_W;
            let pick = PROPS[0];
            for (const p of PROPS) { r -= p.w; if (r <= 0) { pick = p; break; } }
            const x = cx * CHUNK + rnd.frac() * CHUNK;
            const y = cy * CHUNK + rnd.frac() * CHUNK;
            if (Math.hypot(x, y) < 90) { continue; }   // keep spawn clear
            const frame = `${pick.key}_0`;
            if (!this.textures.get('atlas').has(frame)) { continue; }
            const s = this.add.sprite(x, y, 'atlas', frame);
            if (!NODEPTH) { s.setDepth(2000 + y); }
            if (this.anims.exists(pick.key) && !location.search.includes('noanim')) { s.play(pick.key); }
            s.setScale(rnd.realInRange(0.85, 1.2));
            const entry = { sprite: s, light: null };
            const lc = LIGHT_PROPS[pick.key];
            if (lc && !location.search.includes('nolight')) {
                entry.light = this.addLight(x, y + lc.dy, lc.tint, lc.scale, lc.alpha);
            }
            list.push(entry);
        }
        this.chunks.set(key, list);
    }

    /* ═══ xp / levels / chests ═══ */

    addXp(n) {
        this.xpCur += n;
        while (this.xpCur >= this.xpNext) {
            this.xpCur -= this.xpNext;
            this.level++;
            this.xpNext = xpForLevel(this.level);
            this.pendingLevels++;
            if (this.level % 5 === 0) {
                this.player.heal(this.player.maxHp * 0.25);
                this.loot.gold += 25;
                this.banner(`РУБЕЖ ${this.level} УР: +25% ОЗ, +25 ЗОЛОТА`, 0x8ef2a8);
                this.fx.levelRing(this.player.x, this.player.y);
            }
        }
        if (this.pendingLevels > 0 && !this.scene.isActive('Upgrade')) {
            this.openUpgrade();
        }
    }

    openUpgrade() {
        if (this.scene.isActive('Upgrade')) { return; }
        const choices = rollChoices(this, this.playerStats.cards || 4, this.playerStats.luck);
        this.pendingLevels--;
        this.scene.launch('Upgrade', { choices, game: this });
        this.scene.pause();
        Audio.play('levelup');
        this.fx.levelRing(this.player.x, this.player.y);
    }

    onWaveCleared(n) {
        const bonus = Save.altarLevel('a_wave');
        this.banner(`ВОЛНА ${n} ОТБИТА!`, 0x8ef2a8);
        Audio.play('levelup');
        // ember rain around the player
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * 6.283;
            this.loot.dropEmber(this.player.x + Math.cos(a) * 60, this.player.y + Math.sin(a) * 44, i % 3 === 0 ? 1 : 0);
        }
        this.loot.gold += 10 + n * 2;
        if (Math.random() < 0.5) { this.loot.add('flask', this.player.x + 30, this.player.y); }
        if (n % 4 === 0 || Math.random() < 0.25 * bonus) { this.loot.dropChest(this.player.x - 30, this.player.y, false); }
        for (let i = 0; i < bonus; i++) {
            this.loot.add('coin', this.player.x + (Math.random() - 0.5) * 60, this.player.y + (Math.random() - 0.5) * 40, 3);
        }
    }

    openChest(bossChest) {
        const n = bossChest ? 3 : (Math.random() < 0.4 ? 2 : 1);
        const picks = [];
        for (let i = 0; i < n; i++) {
            const choices = rollChoices(this, 4, this.playerStats.luck + 0.5);
            const c = choices[0];
            applyChoice(this, c);
            picks.push(c.name);
        }
        this.banner('СУНДУК: ' + picks.join(' + ').toUpperCase(), 0xffc93c);
        this.fx.levelRing(this.player.x, this.player.y);
        this.hud.setWeaponTray([...this.weapons.keys()]);
        this.hud.refreshWeaponPips(this);
        this.hud.setPassiveTray(Object.entries(this.passives));
    }

    pauseGame() {
        Audio.play('ui');
        this.scene.launch('Pause', { game: this });
        this.scene.pause();
    }

    /* ═══ end states ═══ */

    finish(won) {
        if (this.over) { return; }
        this.over = true;
        EventBus.emit(won ? EV.VICTORY : EV.GAME_OVER);
        Audio.play(won ? 'victory' : 'defeat');
        const gold = Math.round(this.loot.gold);
        Save.addGold(gold);
        Save.recordRun({ time: Math.floor(this.runTime), kills: this.kills, level: this.level, gold, won });
        let firstWin = false;
        if (won && !this.endless && !Save.data.flags.firstWin) {
            Save.data.flags.firstWin = true;
            Save.data.flags.endlessUnlocked = true;
            Save.addGold(250);
            firstWin = true;
            Save.save();
        }
        this.time.delayedCall(won ? 1400 : 900, () => {
            this.scene.stop('Upgrade');
            this.scene.stop('Pause');
            this.scene.start('Result', {
                won, time: Math.floor(this.runTime), kills: this.kills, level: this.level, gold,
                wave: this.director.waveNumber, totalWaves: this.endless ? null : TOTAL_WAVES,
                dmgStats: this.dmgStats,
                firstWin, endless: this.endless, revivesUsed: Save.altarLevel('a_revive') - this.revives
            });
        });
        if (won) { this.banner('РАССВЕТ!', 0xffd98a); if (!location.search.includes('noflash')) { this.fx.flash(255, 210, 150, 0.6, 900); } }
    }

    /* ═══ main loop ═══ */

    update(t, dtMs) {
        let dt = Math.min(0.05, dtMs / 1000) * (this.timeScale || 1);
        if (this.hitstop > 0) {
            this.hitstop -= dt;
            dt = 0;
        }
        if (this.over) { dt = Math.min(dt, 0.016); }

        const realDt = dt;
        if (dt > 0 || this.over) {
            this.runTime += this.over ? 0 : dt;
        }

        /* input */
        const k = this.keys;
        let ix = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        let iy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (this.stick.active) { ix = this.stick.x / 40; iy = this.stick.y / 40; }
        const dashPressed = Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.SHIFT) || this.__dashTap;
        this.__dashTap = false;

        /* player */
        this.player.update(dt, { x: ix, y: iy, dash: dashPressed }, this.playerStats);
        this.player.setDepth(2000 + this.player.y);

        /* director */
        if (!this.over) { this.director.update(dt); }

        /* grid rebuild */
        this.grid.clear();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.dead) { this.enemies.splice(i, 1); continue; }
            this.grid.insert(e);
        }
        /* separation + enemy AI */
        const sep = GameScene._sep || (GameScene._sep = []);
        for (const e of this.enemies) {
            if (e.dead) { continue; }
            if (!location.search.includes('noai')) { e.updateSelf(dt, this.ctx); }
            if (e.dead) { continue; }
            if (location.search.includes('nosep')) { continue; }
            // soft separation
            const near = this.grid.query(e.x, e.y, e.radius + 20, sep);
            let px = 0, py = 0;
            for (const o of near) {
                if (o === e) { continue; }
                const dx = e.x - o.x, dy = e.y - o.y;
                const d2 = dx * dx + dy * dy;
                const min = e.radius + o.radius + 4;
                if (d2 > 0.01 && d2 < min * min) {
                    const d = Math.sqrt(d2);
                    px += (dx / d) * (min - d);
                    py += (dy / d) * (min - d);
                }
            }
            // never stack on the player itself
            const qdx = e.x - this.player.x, qdy = e.y - this.player.y;
            const qd2 = qdx * qdx + qdy * qdy;
            const qmin = e.radius + 6;
            if (qd2 > 0.01 && qd2 < qmin * qmin) {
                const qd = Math.sqrt(qd2);
                px += (qdx / qd) * (qmin - qd) * 1.4;
                py += (qdy / qd) * (qmin - qd) * 1.4;
            }
            if (px || py) {
                e.body.setVelocity(e.body.velocity.x + px * 18, e.body.velocity.y + py * 18);
            }
            // touch damage
            const pdx = this.player.x - e.x, pdy = this.player.y - e.y;
            const pr = e.radius + 11;
            if (pdx * pdx + pdy * pdy < pr * pr && !this.over) {
                if (this.player.hurt(e.dmg, e.x, e.y)) {
                    this.dmg.show(e.dmg, this.player.x, this.player.y - 20, 'hurt');
                }
            }
            // cull
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) > 1500 && e !== this.boss) {
                this.director.onEnemyGone(e);
                e.release();
            }
        }
        /* weapons */
        if (!this.over) {
            for (const w of this.weapons.values()) { w.update(dt, this.ctx); }
        }

        this.updateShots(dt);
        this.updateZones(dt);

        /* enemy bullets */
        for (let i = this.ebullets.length - 1; i >= 0; i--) {
            const b = this.ebullets[i];
            b.__life -= dt;
            b.x += b.__vx * dt;
            b.y += b.__vy * dt;
            const dx = this.player.x - b.x, dy = this.player.y - b.y;
            const rr = b.__r + 8;
            if (dx * dx + dy * dy < rr * rr) {
                if (this.player.hurt(b.__dmg, b.x, b.y)) {
                    this.dmg.show(b.__dmg, this.player.x, this.player.y - 20, 'hurt');
                }
                b.__life = 0;
            }
            if (b.__life <= 0) {
                b.setActive(false).setVisible(false);
                this.ebullets.splice(i, 1);
                this.bulletPool.push(b);
            }
        }

        /* loot & fx */
        this.loot.update(dt, this);
        this.fx.update(realDt);
        this.dmg.update(realDt);
        this.fx.emLeaf.setPosition(this.cameras.main.scrollX + VW / 2, this.cameras.main.scrollY + VH / 2);
        /* world scrolling layers */
        const cam = this.cameras.main;
        this.ground.tilePositionX = cam.scrollX + VW / 2 - this.ground.width / 2;
        this.ground.tilePositionY = cam.scrollY + VH / 2 - this.ground.height / 2;
        if (!this.noChunks) { this.ensureChunks(); }
        /* darkness & dawn */
        // darkness & vignette are screen-space (scrollFactor 0): never reposition
        const dawn = Phaser.Math.Clamp(this.director.waveNumber / TOTAL_WAVES, 0, 1) * (this.director.state === 'done' ? 1 : 0.55);
        this.darkness.setAlpha((this.highQuality ? 0.42 : 0.47) - dawn * 0.38);
        for (const f of this.fogs) {
            f.x += f.__v.x * realDt;
            f.y += f.__v.y * realDt;
            if (f.x < -80) { f.x = VW + 80; }
            if (f.x > VW + 80) { f.x = -80; }
            if (f.y < -60) { f.y = VH + 60; }
            if (f.y > VH + 60) { f.y = -60; }
        }
        // light flicker
        for (let i = 0; i < this.lights.length; i++) {
            const l = this.lights[i];
            l.setAlpha((l.__baseAlpha ?? (l.__baseAlpha = l.alpha)) * (0.86 + Math.sin(t * 0.011 + i * 2.1) * 0.1 + Math.sin(t * 0.031 + i) * 0.05) * (this.glowBoost || 1));
        }
        /* hud */
        this.hud.update(realDt, this);

        /* music intensity */
        Audio.setIntensity(this.runTime < 60 ? 0 : this.runTime < 180 ? 1 : this.runTime < 360 ? 2 : 3);
        Audio.schedule();

        /* death */
        if (this.player.hp <= 0 && !this.over) {
            if (this.revives > 0) {
                this.revives--;
                this.player.hp = this.player.maxHp * 0.5;
                this.player.invuln = 2;
                this.banner('ВТОРОЕ ДЫХАНИЕ!', 0x8ef2a8);
                this.fx.levelRing(this.player.x, this.player.y);
                this.fx.flash(180, 255, 200, 0.5, 300);
                for (const e of this.enemies) {
                    if (!e.dead && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 260) {
                        e.damage(99999, { silent: true });
                    }
                }
                Audio.play('levelup');
            } else {
                this.finish(false);
            }
        }
    }

    teardown() {
        this.fx.destroy();
        this.dmg.destroy();
        this.loot.destroy();
        this.hud.destroy();
        this.stickBase?.destroy(); this.stickKnob?.destroy(); this.dashBtn?.destroy(); this.dashBtnRing?.destroy(); this.dashZone?.destroy();
        for (const w of this.weapons.values()) { w.destroy(); }
        this.enemies.forEach(e => e.destroy());
        this.shots.forEach(s => s.destroy());
        this.ebullets.forEach(b => b.destroy());
        this.enemyPool.forEach(e => e.destroy());
        this.shotPool.forEach(s => s.destroy());
        this.bulletPool.forEach(b => b.destroy());
        this.zones.forEach(z => { z.sprite.destroy(); if (z.light) { z.light.destroy(); } });
        this.lights.forEach(l => l.destroy());
        this.decals.forEach(d => d.destroy());
        this.fogs.forEach(f => f.destroy());
        this.darkness.destroy();
        this.vignette?.destroy();
        this.grade?.destroy();
        this.ground.destroy();
        for (const [, list] of this.chunks) { list.forEach(o => o.sprite.destroy()); }
        EventBus.off(EV.ENEMY_KILLED, this.onEnemyKilled);
    }
}

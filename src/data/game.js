/**
 * Central balance sheet. Every tunable number lives here so the whole game
 * can be rebalanced without touching systems code.
 */

export const RUN = {
    duration: 600,            // seconds until dawn (victory)
    bossTimes: [300, 585],    // Hollow King appearances
    eliteAfter: 90,
    eliteChanceBase: 0.035,
    eliteChanceMax: 0.14,
    maxAlive: 300,
    spawnRingMargin: 90
};

export const PLAYER = {
    hp: 100,
    speed: 96,
    pickupRadius: 42,
    hurtCooldown: 0.85,
    iframes: 0.55,
    dash: { speedMul: 3.4, time: 0.16, cooldown: 2.4, iframes: 0.35 },
    regenBase: 0.4
};

export const xpForLevel = (lvl) => Math.floor((6 + lvl * 4 + Math.pow(lvl, 1.72) * 1.6) * 1.2);

/* ═══ weapons ═══════════════════════════════════════════════════════ */

export const WEAPONS = {
    sparks: {
        name: 'Искры фонаря', icon: 'ic_sparks', max: 8,
        desc: 'Самонаводящиеся искры бьют ближайших врагов.',
        levels: [
            { dmg: 10, cd: 0.95, count: 1, pierce: 0, speed: 260 },
            { dmg: 12, cd: 0.9, count: 1, pierce: 0, speed: 265 },
            { dmg: 14, cd: 0.85, count: 2, pierce: 0, speed: 270 },
            { dmg: 17, cd: 0.8, count: 2, pierce: 1, speed: 280 },
            { dmg: 20, cd: 0.75, count: 3, pierce: 1, speed: 285 },
            { dmg: 24, cd: 0.7, count: 3, pierce: 1, speed: 295 },
            { dmg: 28, cd: 0.65, count: 4, pierce: 2, speed: 300 },
            { dmg: 34, cd: 0.6, count: 4, pierce: 2, speed: 310 }
        ],
        evo: { need: 'power', needLvl: 5, into: 'solar', name: 'Солнечный шквал' }
    },
    blades: {
        name: 'Клинки стража', icon: 'ic_blades', max: 8,
        desc: 'Вращающиеся клинки рубят всё вокруг вас.',
        levels: [
            { dmg: 12, count: 2, radius: 46, spin: 2.4, cd: 0.55 },
            { dmg: 14, count: 3, radius: 48, spin: 2.5, cd: 0.52 },
            { dmg: 16, count: 3, radius: 52, spin: 2.7, cd: 0.5 },
            { dmg: 19, count: 4, radius: 55, spin: 2.9, cd: 0.47 },
            { dmg: 22, count: 4, radius: 59, spin: 3.1, cd: 0.44 },
            { dmg: 26, count: 5, radius: 63, spin: 3.3, cd: 0.42 },
            { dmg: 30, count: 5, radius: 67, spin: 3.5, cd: 0.4 },
            { dmg: 36, count: 6, radius: 72, spin: 3.7, cd: 0.37 }
        ],
        evo: { need: 'haste', needLvl: 5, into: 'dawnblade', name: 'Клинки рассвета' }
    },
    nova: {
        name: 'Угольная волна', icon: 'ic_nova', max: 8,
        desc: 'Кольцо огня отбрасывает и поджигает врагов.',
        levels: [
            { dmg: 18, cd: 3.4, radius: 74, knock: 120 },
            { dmg: 21, cd: 3.2, radius: 80, knock: 130 },
            { dmg: 25, cd: 3.0, radius: 86, knock: 140 },
            { dmg: 29, cd: 2.8, radius: 93, knock: 150 },
            { dmg: 34, cd: 2.6, radius: 100, knock: 165 },
            { dmg: 40, cd: 2.4, radius: 108, knock: 180 },
            { dmg: 47, cd: 2.2, radius: 116, knock: 195 },
            { dmg: 56, cd: 2.0, radius: 126, knock: 215 }
        ],
        evo: { need: 'area', needLvl: 5, into: 'ashstorm', name: 'Пепельная буря' }
    },
    runes: {
        name: 'Руны уз', icon: 'ic_runes', max: 8,
        desc: 'Опутывающие руны жгут скопления врагов.',
        levels: [
            { dps: 13, cd: 4.2, radius: 40, dur: 3.4, max: 2 },
            { dps: 15, cd: 4.0, radius: 43, dur: 3.6, max: 2 },
            { dps: 18, cd: 3.8, radius: 46, dur: 3.8, max: 3 },
            { dps: 21, cd: 3.6, radius: 50, dur: 4.0, max: 3 },
            { dps: 25, cd: 3.4, radius: 54, dur: 4.2, max: 4 },
            { dps: 29, cd: 3.2, radius: 58, dur: 4.4, max: 4 },
            { dps: 34, cd: 3.0, radius: 63, dur: 4.6, max: 5 },
            { dps: 41, cd: 2.8, radius: 68, dur: 5.0, max: 5 }
        ]
    },
    lance: {
        name: 'Ледяное копьё', icon: 'ic_lance', max: 8,
        desc: 'Пронзающий луч замораживает врагов насквозь.',
        levels: [
            { dmg: 16, cd: 2.5, pierce: 3, slow: 0.35, slowDur: 1.4 },
            { dmg: 19, cd: 2.4, pierce: 4, slow: 0.38, slowDur: 1.5 },
            { dmg: 22, cd: 2.3, pierce: 5, slow: 0.4, slowDur: 1.6 },
            { dmg: 26, cd: 2.2, pierce: 6, slow: 0.43, slowDur: 1.7 },
            { dmg: 31, cd: 2.0, pierce: 7, slow: 0.46, slowDur: 1.8 },
            { dmg: 36, cd: 1.9, pierce: 8, slow: 0.5, slowDur: 1.9 },
            { dmg: 43, cd: 1.8, pierce: 10, slow: 0.54, slowDur: 2.0 },
            { dmg: 52, cd: 1.6, pierce: 12, slow: 0.6, slowDur: 2.2 }
        ]
    },
    flasks: {
        name: 'Огненные флаконы', icon: 'ic_flask', max: 8,
        desc: 'Броски оставляют горящие лужи.',
        levels: [
            { dmg: 8, dps: 11, cd: 3.2, count: 1, radius: 26, dur: 3.0 },
            { dmg: 9, dps: 13, cd: 3.1, count: 1, radius: 28, dur: 3.2 },
            { dmg: 11, dps: 15, cd: 2.9, count: 2, radius: 30, dur: 3.4 },
            { dmg: 12, dps: 18, cd: 2.8, count: 2, radius: 32, dur: 3.6 },
            { dmg: 14, dps: 21, cd: 2.6, count: 2, radius: 34, dur: 3.8 },
            { dmg: 16, dps: 25, cd: 2.5, count: 3, radius: 36, dur: 4.0 },
            { dmg: 19, dps: 29, cd: 2.3, count: 3, radius: 39, dur: 4.2 },
            { dmg: 22, dps: 35, cd: 2.1, count: 4, radius: 42, dur: 4.5 }
        ]
    },

    whip: {
        name: 'Плеть света', icon: 'ic_whip', max: 8,
        desc: 'Хлещет дугой перед вами, отбрасывая врагов.',
        levels: [
            { dmg: 20, cd: 1.5, range: 52, height: 26, knock: 160 },
            { dmg: 24, cd: 1.45, range: 55, height: 27, knock: 170 },
            { dmg: 28, cd: 1.4, range: 58, height: 28, knock: 180 },
            { dmg: 33, cd: 1.3, range: 61, height: 30, knock: 190, both: true },
            { dmg: 39, cd: 1.25, range: 64, height: 32, knock: 200, both: true },
            { dmg: 46, cd: 1.2, range: 68, height: 34, knock: 215, both: true },
            { dmg: 54, cd: 1.1, range: 72, height: 36, knock: 230, both: true },
            { dmg: 65, cd: 1.0, range: 78, height: 40, knock: 250, both: true }
        ]
    },
    boom: {
        name: 'Рунный бумеранг', icon: 'ic_boomerang', max: 8,
        desc: 'Улетает и возвращается, пронзая всех на пути.',
        levels: [
            { dmg: 14, cd: 2.6, count: 1, range: 150 },
            { dmg: 16, cd: 2.5, count: 1, range: 160 },
            { dmg: 19, cd: 2.4, count: 2, range: 165 },
            { dmg: 22, cd: 2.3, count: 2, range: 175 },
            { dmg: 26, cd: 2.2, count: 2, range: 185 },
            { dmg: 30, cd: 2.0, count: 3, range: 195 },
            { dmg: 35, cd: 1.9, count: 3, range: 205 },
            { dmg: 42, cd: 1.7, count: 4, range: 220 }
        ]
    },

    /* ── evolutions ── */
    solar: {
        name: 'Солнечный шквал', icon: 'ic_solar', max: 1, evolved: true,
        desc: 'Искры стали пронзающим солнечным ливнем.',
        levels: [{ dmg: 46, cd: 0.45, count: 7, pierce: 4, speed: 340, burn: 14 }]
    },
    dawnblade: {
        name: 'Клинки рассвета', icon: 'ic_dawnblade', max: 1, evolved: true,
        desc: 'Девять пылающих клинков рассекают ночь.',
        levels: [{ dmg: 52, count: 9, radius: 86, spin: 4.4, cd: 0.26, trail: true }]
    },
    ashstorm: {
        name: 'Пепельная буря', icon: 'ic_ashstorm', max: 1, evolved: true,
        desc: 'Двойное кольцо оставляет выжженную землю.',
        levels: [{ dmg: 78, cd: 1.7, radius: 150, knock: 260, scorch: true }]
    }
};

/* ═══ passives ══════════════════════════════════════════════════════ */

export const PASSIVES = {
    power: { name: 'Сила', icon: 'ic_power', max: 5, desc: '+10% урона за уровень', step: 0.10 },
    haste: { name: 'Рвение', icon: 'ic_haste', max: 5, desc: '+10% скорости атаки', step: 0.10 },
    speed: { name: 'Поступь', icon: 'ic_speed', max: 5, desc: '+7% скорости бега', step: 0.07 },
    vitality: { name: 'Стойкость', icon: 'ic_vitality', max: 5, desc: '+16 макс. ОЗ и +0.2 ОЗ/с', stepHp: 16, stepRegen: 0.2 },
    crit: { name: 'Точность', icon: 'ic_crit', max: 5, desc: '+6% шанс крита, +25% крит. урон', stepChance: 0.06, stepDmg: 0.25 },
    magnet: { name: 'Магнетизм', icon: 'ic_magnet', max: 5, desc: '+18% радиус подбора', step: 0.18 },
    area: { name: 'Размах', icon: 'ic_area', max: 5, desc: '+10% область эффектов', step: 0.10 },
    multishot: { name: 'Залп', icon: 'ic_multishot', max: 3, desc: '+1 снаряд (искры, копья, флаконы)', step: 1 },
    cooldown: { name: 'Размеренность', icon: 'ic_cooldown', max: 5, desc: '-7% перезарядки оружия', step: 0.07 },
    greed: { name: 'Жадность', icon: 'ic_greed', max: 5, desc: '+12% опыта и золота', step: 0.12 }
};

/* ═══ altar (meta upgrades, bought with gold) ═══════════════════════ */

export const ALTAR = {
    a_hp: { name: 'Камень крови', icon: 'ic_shield', max: 5, base: 60, mult: 1.7, desc: '+12 макс. ОЗ навсегда', per: 12 },
    a_dmg: { name: 'Точило', icon: 'ic_sword', max: 5, base: 70, mult: 1.7, desc: '+5% урона навсегда', per: 0.05 },
    a_speed: { name: 'Лёгкий шаг', icon: 'ic_speed', max: 4, base: 60, mult: 1.7, desc: '+3% скорости навсегда', per: 0.03 },
    a_gold: { name: 'Копилка', icon: 'ic_coinbag', max: 4, base: 80, mult: 1.7, desc: '+10% золота навсегда', per: 0.1 },
    a_luck: { name: 'Фонарь удачи', icon: 'ic_luck', max: 3, base: 120, mult: 1.8, desc: '+8% шанс редких наград', per: 0.08 },
    a_revive: { name: 'Второе дыхание', icon: 'ic_revive', max: 2, base: 250, mult: 2.2, desc: '+1 возрождение с 50% ОЗ', per: 1 },
    a_regen: { name: 'Роса', icon: 'ic_drop', max: 4, base: 70, mult: 1.7, desc: '+0.25 ОЗ/с навсегда', per: 0.25 },
    a_start: { name: 'Запасной фитиль', icon: 'ic_lantern', max: 1, base: 400, mult: 1, desc: 'Старт со случайным 2-м оружием', per: 1 },
    a_dash: { name: 'Лёгкие сапоги', icon: 'ic_dash', max: 3, base: 90, mult: 1.7, desc: '−8% перезарядка рывка', per: 0.08 },
    a_boss: { name: 'Цареубийца', icon: 'ic_crown', max: 3, base: 110, mult: 1.8, desc: '+7% урона по боссам', per: 0.07 },
    a_wave: { name: 'Трофеи', icon: 'ic_chest', max: 2, base: 140, mult: 1.9, desc: '+1 награда за волну', per: 1 },
    a_card: { name: 'Дар судьбы', icon: 'ic_tome', max: 1, base: 500, mult: 1, desc: '+1 карта в выборе уровня', per: 1 }
};

export const altarCost = (id, lvl) => Math.round(ALTAR[id].base * Math.pow(ALTAR[id].mult, lvl));

/* ═══ enemies ═══════════════════════════════════════════════════════ */

export const ENEMIES = {
    shade: { hp: 13, speed: 44, dmg: 9, xp: 1, radius: 8, gold: 0.06, sprite: 'shade', anim: 'shade', scale: 1, unlock: 0, weight: 10 },
    wisp: { hp: 8, speed: 80, dmg: 7, xp: 1, radius: 6, gold: 0.05, sprite: 'wisp', anim: 'wisp', scale: 1, unlock: 40, weight: 8, ai: 'zigzag' },
    crawler: { hp: 6, speed: 98, dmg: 5, xp: 1, radius: 5, gold: 0.03, sprite: 'crawler', anim: 'crawler', scale: 1, unlock: 75, weight: 10, ai: 'swarm' },
    spitter: { hp: 22, speed: 40, dmg: 8, xp: 3, radius: 9, gold: 0.1, sprite: 'spitter', anim: 'spitter', scale: 1, unlock: 130, weight: 6, ai: 'ranged', shootCd: 3.2 },
    bomber: { hp: 28, speed: 58, dmg: 24, xp: 4, radius: 9, gold: 0.12, sprite: 'bomber', anim: 'bomber', scale: 1, unlock: 230, weight: 5, ai: 'bomber' },
    husk: { hp: 70, speed: 27, dmg: 18, xp: 6, radius: 13, gold: 0.2, sprite: 'husk', anim: 'husk', scale: 1, unlock: 300, weight: 4, ai: 'tank' },
    boss: { hp: 2600, speed: 34, dmg: 30, xp: 120, radius: 30, gold: 6, sprite: 'boss', anim: 'boss', scale: 1, ai: 'boss' }
};

/** Hit-point multiplier over run time (minutes). */
export const hpCurve = (t) => 1 + (t / 60) * 0.24 + Math.pow(t / 60, 2) * 0.055;
/** Spawn budget per second over time. */
export const spawnRate = (t) => 1.6 + (t / 60) * 1.15 + Math.pow(t / 60, 1.8) * 0.35;

export const ELITE = { hpMul: 5.5, dmgMul: 1.5, scale: 1.32, speedMul: 0.92, xpMul: 8, goldMul: 12 };

/* ═══ pickups ═══════════════════════════════════════════════════════ */

export const PICKUP = {
    emberS: { xp: 1, sprite: 'ember_s', anim: 'ember_s', magnet: true },
    emberM: { xp: 5, sprite: 'ember_m', anim: 'ember_m', magnet: true },
    emberL: { xp: 20, sprite: 'ember_l', anim: 'ember_l', magnet: true },
    flask: { heal: 30, sprite: 'flask', anim: 'flask' },
    magnet: { sprite: 'magnet', anim: 'magnet' },
    bomb: { sprite: 'bomb', anim: 'bomb' },
    chest: { sprite: 'chest', anim: 'chest' },
    coin: { gold: 1, sprite: 'coin', anim: 'coin' }
};

;

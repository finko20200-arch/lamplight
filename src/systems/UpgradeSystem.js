import { WEAPONS, PASSIVES } from '../data/game.js';

/**
 * Level-up draft: builds the 4-card choice from the current build,
 * including evolution cards when their conditions are met.
 */

export const RARITY = {
    common: { color: 0xcdb98f, name: 'Обычное' },
    rare: { color: 0x63d8f0, name: 'Редкое' },
    epic: { color: 0xa45cff, name: 'Эпическое' },
    legend: { color: 0xffc93c, name: 'Легендарное' }
};

export function canEvolve(game, weaponKey) {
    const def = WEAPONS[weaponKey];
    if (!def.evo) { return false; }
    const w = game.weapons.get(weaponKey);
    if (!w || w.level < def.max) { return false; }
    if (game.evolved.has(def.evo.into)) { return false; }
    return (game.passives[def.evo.need] || 0) >= def.evo.needLvl;
}

export function rollChoices(game, count = 4, luck = 0) {
    const pool = [];
    const heldW = [...game.weapons.keys()];
    const heldP = Object.keys(game.passives);

    // 1) evolutions — always offered first
    for (const k of heldW) {
        if (canEvolve(game, k)) {
            const evo = WEAPONS[k].evo;
            pool.push({
                kind: 'evo', key: evo.into, weight: 1000, rarity: 'legend',
                name: evo.name, icon: WEAPONS[evo.into].icon,
                desc: WEAPONS[evo.into].desc, from: WEAPONS[k].name
            });
        }
    }

    // 2) weapon upgrades
    for (const k of heldW) {
        const def = WEAPONS[k];
        const w = game.weapons.get(k);
        if (w.level >= def.max) { continue; }
        pool.push({
            kind: 'weapon', key: k, weight: 10, rarity: w.level >= def.max - 2 ? 'epic' : 'rare',
            name: def.name, icon: def.icon, level: w.level + 1, max: def.max,
            desc: levelDesc(k, w.level + 1)
        });
    }

    // 3) new weapons
    if (heldW.length < 5) {
        for (const k of Object.keys(WEAPONS)) {
            if (WEAPONS[k].evolved || heldW.includes(k)) { continue; }
            pool.push({ kind: 'newWeapon', key: k, weight: 6, rarity: 'rare', name: WEAPONS[k].name, icon: WEAPONS[k].icon, desc: WEAPONS[k].desc, level: 1, max: WEAPONS[k].max });
        }
    }

    // 4) passive upgrades
    for (const k of heldP) {
        const def = PASSIVES[k];
        if (game.passives[k] >= def.max) { continue; }
        pool.push({
            kind: 'passive', key: k, weight: 8, rarity: game.passives[k] >= def.max - 1 ? 'epic' : 'common',
            name: def.name, icon: def.icon, level: game.passives[k] + 1, max: def.max, desc: def.desc
        });
    }

    // 5) new passives
    if (heldP.length < 6) {
        for (const k of Object.keys(PASSIVES)) {
            if (heldP.includes(k)) { continue; }
            pool.push({ kind: 'newPassive', key: k, weight: 5, rarity: 'common', name: PASSIVES[k].name, icon: PASSIVES[k].icon, desc: PASSIVES[k].desc, level: 1, max: PASSIVES[k].max });
        }
    }

    // 6) consumables
    if (game.player.hp < game.player.maxHp * 0.7) {
        pool.push({ kind: 'heal', key: 'heal', weight: 4, rarity: 'common', name: 'Настойка', icon: 'ic_vitality', desc: 'Восстановить 35% ОЗ' });
    }
    pool.push({ kind: 'gold', key: 'gold', weight: 2, rarity: 'common', name: 'Кошель', icon: 'ic_gold', desc: '+80 золота сразу' });
    pool.push({ kind: 'rerollFree', key: 'reroll', weight: 1.5, rarity: 'rare', name: 'Провидение', icon: 'ic_luck', desc: '+1 бесплатный переброс' });

    // weighted unique pick
    const picked = [];
    const bag = pool.slice();
    while (picked.length < count && bag.length) {
        let total = 0;
        for (const c of bag) { total += c.weight * (1 + (c.rarity === 'epic' || c.rarity === 'legend' ? luck : 0)); }
        let r = Math.random() * total;
        let idx = 0;
        for (let i = 0; i < bag.length; i++) {
            r -= bag[i].weight * (1 + (bag[i].rarity === 'epic' || bag[i].rarity === 'legend' ? luck : 0));
            if (r <= 0) { idx = i; break; }
        }
        const c = bag.splice(idx, 1)[0];
        if (picked.some(p => p.kind === c.kind && p.key === c.key)) { continue; }
        picked.push(c);
    }
    return picked;
}

function levelDesc(key, lvl) {
    const t = WEAPONS[key].levels[Math.min(lvl, WEAPONS[key].levels.length) - 1];
    const prev = WEAPONS[key].levels[Math.min(lvl - 1, WEAPONS[key].levels.length) - 1] || {};
    const parts = [];
    if (t.dmg && t.dmg !== prev.dmg) { parts.push(`урон ${t.dmg}`); }
    if (t.count && t.count !== prev.count) { parts.push(`снарядов ${t.count}`); }
    if (t.pierce !== undefined && t.pierce !== prev.pierce) { parts.push(`пробитие ${t.pierce}`); }
    if (t.radius && t.radius !== prev.radius) { parts.push(`радиус ${t.radius}`); }
    if (t.cd && t.cd !== prev.cd) { parts.push(`перезарядка ${t.cd}с`); }
    if (t.max && t.max !== prev.max) { parts.push(`целей ${t.max}`); }
    return parts.length ? parts.join(', ') : WEAPONS[key].desc;
}

export function applyChoice(game, choice) {
    switch (choice.kind) {
        case 'weapon': game.weapons.get(choice.key).levelUp(); break;
        case 'newWeapon': game.addWeapon(choice.key); break;
        case 'passive': game.passives[choice.key] = (game.passives[choice.key] || 0) + 1; break;
        case 'newPassive': game.passives[choice.key] = 1; break;
        case 'evo': {
            const from = Object.keys(WEAPONS).find(k => WEAPONS[k].evo && WEAPONS[k].evo.into === choice.key);
            const old = game.weapons.get(from);
            old?.destroy();
            game.weapons.delete(from);
            game.evolved.add(choice.key);
            game.addWeapon(choice.key, 1);
            game.fx.levelRing(game.player.x, game.player.y);
            game.banner(`ЭВОЛЮЦИЯ: ${choice.name.toUpperCase()}`, 0xffc93c);
            break;
        }
        case 'heal': game.player.heal(game.player.maxHp * 0.35); break;
        case 'gold': game.loot.gold += 80; break;
        case 'rerollFree': game.rerolls += 1; break;
    }
    game.recalcStats();
}

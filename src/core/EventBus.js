/** Tiny synchronous event bus shared between scenes/systems. */
class Bus {
    constructor() { this.map = new Map(); }
    on(name, fn, ctx = null) {
        if (!this.map.has(name)) { this.map.set(name, []); }
        this.map.get(name).push({ fn, ctx });
        return () => this.off(name, fn);
    }
    off(name, fn) {
        const list = this.map.get(name);
        if (!list) { return; }
        const i = list.findIndex(e => e.fn === fn);
        if (i >= 0) { list.splice(i, 1); }
    }
    emit(name, ...args) {
        const list = this.map.get(name);
        if (!list) { return; }
        for (let i = 0; i < list.length; i++) { list[i].fn.call(list[i].ctx, ...args); }
    }
    clear() { this.map.clear(); }
}

export const EventBus = new Bus();

export const EV = {
    PLAYER_HIT: 'player:hit',
    PLAYER_HEAL: 'player:heal',
    PLAYER_DASH: 'player:dash',
    PLAYER_DIED: 'player:died',
    ENEMY_KILLED: 'enemy:killed',
    ENEMY_SPAWNED: 'enemy:spawned',
    BOSS_SPAWNED: 'boss:spawned',
    BOSS_KILLED: 'boss:killed',
    XP_GAINED: 'xp:gained',
    LEVEL_UP: 'level:up',
    LEVEL_CHOSEN: 'level:chosen',
    GOLD_GAINED: 'gold:gained',
    CHEST_OPENED: 'chest:opened',
    WEAPON_FIRED: 'weapon:fired',
    CRIT: 'hit:crit',
    PICKUP: 'pickup',
    BANNER: 'ui:banner',
    SHAKE: 'fx:shake',
    HITSTOP: 'fx:hitstop',
    FLASH: 'fx:flash',
    GAME_OVER: 'game:over',
    VICTORY: 'game:victory',
    PAUSE: 'game:pause',
    RESUME: 'game:resume'
};

/**
 * Platform detection & performance profiles.
 * The game targets mobile web, desktop web and PC: every visual/system budget
 * is derived from a single profile so weak devices stay at 60 fps.
 */

import { Save } from './Save.js';

const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';

export const Platform = {
    touch: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0),
    mobile: /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) || (typeof window !== 'undefined' && window.innerWidth < 900 && ('ontouchstart' in window)),
    cores: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4,
    memGb: (typeof navigator !== 'undefined' && navigator.deviceMemory) || 4,

    /** 'low' | 'mid' | 'high' — used for every budget in the game. */
    tier() {
        try {
            const pref = Save.get('tier', 'auto');
            if (pref && pref !== 'auto') { return pref; }
        } catch (e) { /* noop */ }
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('lamplight.tier') : null;
        if (saved) { return saved; }
        if (this.mobile || this.touch && this.cores <= 4) { return 'low'; }
        if (this.cores <= 4 || this.memGb <= 4) { return 'mid'; }
        return 'high';
    },

    setTier(t) {
        try { localStorage.setItem('lamplight.tier', t); } catch (e) { /* noop */ }
    },

    /** Central budget table. */
    budgets(tier = this.tier()) {
        switch (tier) {
            case 'low':
                return {
                    maxAlive: 150, fog: 3, lights: 20, decals: 40, fxActive: 110,
                    particles: 0.5, fpsCap: 60, glowBoost: 1, propDensity: 0.6, leaf: false
                };
            case 'mid':
                return {
                    maxAlive: 240, fog: 4, lights: 32, decals: 64, fxActive: 170,
                    particles: 0.8, fpsCap: 60, glowBoost: 1, propDensity: 0.85, leaf: true
                };
            default:
                return {
                    maxAlive: 300, fog: 6, lights: 48, decals: 90, fxActive: 220,
                    particles: 1, fpsCap: 0, glowBoost: 1, propDensity: 1, leaf: true
                };
        }
    }
};

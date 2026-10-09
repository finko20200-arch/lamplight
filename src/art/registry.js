import { PixelBuffer } from './PixelBuffer.js';
import { HERO_FRAMES, HERO_W, HERO_H, paintHero, paintHeroGhost } from './sprites/hero.js';
import { ENEMY_SPRITES } from './sprites/enemies.js';
import { PROP_SPRITES } from './sprites/props.js';
import { ITEM_SPRITES } from './sprites/items.js';
import { PROJECTILE_SPRITES } from './sprites/projectiles.js';
import { FX_SPRITES } from './sprites/fx.js';
import { UI_SPRITES } from './sprites/ui.js';
import { GLYPH_SPRITES } from './sprites/digits.js';

/**
 * Central sprite registry.
 *
 * Every entry is renderer-agnostic:
 *   { key, w, h, frames:[names], paint(buf, frameIndex) }
 *
 * The same definitions feed:
 *   • the runtime atlas builder (src/art/AtlasBuilder.js → Phaser textures)
 *   • the Node art-QA tool (tools/art-preview.mjs → PNG contact sheets)
 */

export const SPRITE_GROUPS = [
    {
        name: 'hero',
        sprites: [
            { key: 'hero', w: HERO_W, h: HERO_H, frames: HERO_FRAMES, paint: paintHero },
            { key: 'hero_ghost', w: HERO_W, h: HERO_H, frames: ['hero_ghost'], paint: (b) => paintHeroGhost(b) }
        ]
    },
    { name: 'enemies', sprites: ENEMY_SPRITES },
    { name: 'props', sprites: PROP_SPRITES },
    { name: 'items', sprites: ITEM_SPRITES },
    { name: 'projectiles', sprites: PROJECTILE_SPRITES },
    { name: 'fx', sprites: FX_SPRITES },
    { name: 'ui', sprites: UI_SPRITES },
    { name: 'digits', sprites: GLYPH_SPRITES }
];

export const ALL_SPRITES = SPRITE_GROUPS.flatMap(g => g.sprites);

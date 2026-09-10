import { loadIcons } from './lib/icons.js';
import { Sprite } from './lib/sprites.js';
import config from './config/sprites.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dirIcons = new URL('../icons', import.meta.url).pathname;
const dirSprites = new URL('../release/sprites/', import.meta.url).pathname;

rmSync(dirSprites, { recursive: true, force: true });
mkdirSync(dirSprites, { recursive: true });

const names: string[] = [];

for (const [name, sets] of Object.entries(config.spritesheets)) {
	console.log('build ' + name);
	names.push(name);

	console.log('  - load icons');
	// Sources are organized by provenance under icons/<source>/; each config entry names the file
	// it draws from, so the sheet is assembled purely from the config.
	const icons = loadIcons(sets, dirIcons);

	console.log('  - build sprite sheet');
	const maxScale = 12;
	const spriteBig = await Sprite.fromIcons(icons, maxScale, 5);

	// Metadata sidecar: `sprites/<name>.meta.json`, keyed by the same `<group>-<name>` ids the
	// sprite JSON uses, so an icon picker can join the two and offer search. Written only when a
	// sheet actually carries tags or descriptions (today: `extras`).
	const meta: Record<string, { tags?: string[]; description?: string }> = {};
	for (const [group, set] of Object.entries(sets)) {
		for (const [icon, spec] of Object.entries(set.icons)) {
			if (typeof spec === 'string') continue;
			if (!spec.tags?.length && !spec.description && !spec.aliases?.length) continue;
			meta[`${group}-${icon}`] = {
				...(spec.description ? { description: spec.description } : {}),
				...(spec.tags?.length ? { tags: spec.tags } : {}),
				...(spec.aliases?.length ? { aliases: spec.aliases } : {}),
			};
		}
	}
	if (Object.keys(meta).length > 0) {
		console.log('  - write metadata (' + Object.keys(meta).length + ' icons)');
		writeFileSync(resolve(dirSprites, `${name}.meta.json`), JSON.stringify(meta, null, '\t'));
	}

	// Flat layout: each sheet is `sprites/<name>{,@2x,@3x,@4x}.{png,json}` (the sheet name is the
	// filename, so a sprite `id` maps 1:1 to its URL tail — e.g. id "base" → sprites/base).
	for (const scale of config.ratios) {
		console.log('  - write scale ' + scale);
		const suffix = scale === 1 ? '' : `@${scale}x`;
		const sprite = spriteBig.getScaledSprite(maxScale / scale);
		sprite.renderSDF(scale);
		const png = await sprite.getPng();
		const json = await sprite.getJSON();

		writeFileSync(resolve(dirSprites, `${name}${suffix}.png`), png);
		writeFileSync(resolve(dirSprites, `${name}${suffix}.json`), json);
	}
}

writeFileSync(resolve(dirSprites, 'index.json'), JSON.stringify(names));

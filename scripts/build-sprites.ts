import { loadIcons } from './lib/icons.js';
import { Sprite } from './lib/sprites.js';
import config from './config-sprites.js';
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
	// Icons live under icons/<sheet>/<group>/; loadIcons resolves <group> from the dir it's given.
	const icons = loadIcons(sets, resolve(dirIcons, name));

	console.log('  - build sprite sheet');
	const maxScale = 12;
	const spriteBig = await Sprite.fromIcons(icons, maxScale, 5);

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

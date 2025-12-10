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
	const icons = loadIcons(sets, dirIcons);

	console.log('  - build sprite sheet');
	const maxScale = 12;
	const spriteBig = await Sprite.fromIcons(icons, maxScale, 5);

	const spriteFolder = resolve(dirSprites, name);
	mkdirSync(spriteFolder, { recursive: true });
	for (const scale of config.ratios) {
		console.log('  - write scale ' + scale);
		const suffix = scale === 1 ? '' : `@${scale}x`;
		const sprite = spriteBig.getScaledSprite(maxScale / scale);
		sprite.renderSDF(scale);
		const png = await sprite.getPng();
		const json = await sprite.getJSON();

		writeFileSync(resolve(spriteFolder, `sprites${suffix}.png`), png);
		writeFileSync(resolve(spriteFolder, `sprites${suffix}.json`), json);
	}
}

writeFileSync(resolve(dirSprites, 'index.json'), JSON.stringify(names));

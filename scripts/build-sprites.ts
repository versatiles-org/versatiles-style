
import { loadIcons } from './lib/icons.ts';
import { Sprite } from './lib/sprites.ts';
import config from './config-sprites.ts';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dirIcons = new URL('../icons', import.meta.url).pathname;
const dirSprites = new URL('../release/sprites/', import.meta.url).pathname;

rmSync(dirSprites, { recursive: true, force: true })
mkdirSync(dirSprites, { recursive: true });

console.log('load icons');
const icons = loadIcons(config.sets, dirIcons);

console.log('build sprite');
const maxScale = 12;
const spriteBig = await Sprite.fromIcons(icons, maxScale, 5);

const spriteFolder = resolve(dirSprites, 'basics');
mkdirSync(spriteFolder, { recursive: true });
for (const scale of config.ratios) {
	const suffix = scale === 1 ? '' : `@${scale}x`;
	console.log('scale sprite ' + scale);
	const sprite = spriteBig.getScaledSprite(maxScale / scale);
	sprite.renderSDF();
	const png = await sprite.getPng()
	const json = await sprite.getJSON()

	writeFileSync(resolve(spriteFolder, `sprites${suffix}.png`), png);
	writeFileSync(resolve(spriteFolder, `sprites${suffix}.json`), json);
}

writeFileSync(resolve(dirSprites, 'index.json'), JSON.stringify(['basics']));

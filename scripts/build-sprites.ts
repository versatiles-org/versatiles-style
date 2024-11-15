
import { loadIcons } from './lib/icons.ts';
import { Sprite } from './lib/sprites.ts';
import config from './config-sprites.ts';
import { mkdirSync, writeFileSync } from 'node:fs';

const dirIcons = new URL('../icons', import.meta.url).pathname;
const dirSprites = new URL('../release/sprites', import.meta.url).pathname;

mkdirSync(dirSprites, { recursive: true });

console.log('load icons');
const icons = loadIcons(config.sets, dirIcons);

console.log('build sprite');
const maxScale = 12;
const spriteBig = await Sprite.fromIcons(icons, maxScale, 5);

for (const scale of config.ratios) {
	const suffix = scale === 1 ? '' : `@${scale}x`;
	console.log('scale sprite ' + scale);
	const sprite = spriteBig.getScaledSprite(maxScale / scale);
	sprite.renderSDF();
	const png = await sprite.getPng()
	const json = await sprite.getJSON()

	writeFileSync(`${dirSprites}/sprites${suffix}.png`, png);
	writeFileSync(`${dirSprites}/sprites${suffix}.json`, json);
}

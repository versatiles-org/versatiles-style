
import { loadIcons } from './lib/icons.ts';
import { Sprite } from './lib/sprites.ts';
import config from './config-sprites.ts';
import { createWriteStream, mkdirSync } from 'node:fs';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';



const dirTarget = new URL('../release', import.meta.url).pathname;
const dirIcons = new URL('../icons', import.meta.url).pathname;

mkdirSync(dirTarget, { recursive: true });
const pack = tar.pack();

console.log('load icons');
const icons = loadIcons(config.sets, dirIcons);

console.log('build sprite');
const maxScale = 12;
const sprite = await Sprite.fromIcons(icons, maxScale, 5);

for (const scale of config.ratios) {
	const suffix = scale === 1 ? '' : `@${scale}x`;
	console.log('scale sprite ' + scale);
	const spriteLevel = sprite.getScaledSprite(maxScale / scale);
	spriteLevel.renderSDF();
	await spriteLevel.saveToTar(`sprites${suffix}`, pack);
}

pack.finalize();

await pipeline(
	pack,
	createGzip({ level: 9 }),
	createWriteStream(resolve(dirTarget, 'sprites.tar.gz')),
);

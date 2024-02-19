
import { loadIcons } from './lib/icons.ts';
import { Sprite } from './lib/sprites.ts';
import config from './config-sprites.ts';
import { createWriteStream, mkdirSync } from 'node:fs';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import { resolve } from 'node:path';



const dirTarget = new URL('../release', import.meta.url).pathname;
const dirIcons = new URL('../icons', import.meta.url).pathname;

mkdirSync(dirTarget, { recursive: true });

const pack = tar.pack();

console.log('load icons');
const icons = loadIcons(config.sets, dirIcons);

console.log('build sprite');
const maxScale = 12;
const sprite = await Sprite.fromIcons(icons, maxScale, 5);

console.log('calc sdf');
sprite.calcSDF();

for (const [suffix, scale] of Object.entries(config.ratio)) {
	console.log('scale sprite ' + scale);
	const spriteSdf = sprite.getScaledSprite(maxScale / scale);
	spriteSdf.renderSDF();
	await spriteSdf.saveToTar(`sprites${suffix}`, pack);
}

pack.finalize();
pack
	.pipe(createGzip({ level: 9 }))
	.pipe(createWriteStream(resolve(dirTarget, 'sprites.tar.gz')));

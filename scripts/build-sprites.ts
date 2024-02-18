
import { loadIcons } from './lib/icons.js';
import { Sprite, buildSprite, buildSpriteEntries } from './lib/sprites.js';
import config from './config.js';
import { calcSDF, renderSDFSprite, scaleSDFSprite } from './lib/sdf.js';
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import { resolve } from 'node:path';



const dirTarget = new URL('../release', import.meta.url).pathname;
const dirIcons = new URL('../icons', import.meta.url).pathname;

if (existsSync(dirTarget)) {
	rmSync(dirTarget, { recursive: true });
}
mkdirSync(dirTarget, { recursive: true });

const pack = tar.pack();

console.log('load icons');
const icons = loadIcons(config.sets, dirIcons);

console.log('build sprite');
const maxScale = 12;
const spriteEntries = buildSpriteEntries(icons, maxScale, 5);
const sprite = await buildSprite(spriteEntries);

console.log('calc sdf');
const spriteSdfLarge = calcSDF(sprite);
// await saveSprite(renderSDFSprite(spriteSdfLarge), resolve(dirTarget, `sprites_test`))

for (const [suffix, scale] of Object.entries(config.ratio)) {
	console.log('scale sprite ' + scale);
	const spriteSdf = scaleSDFSprite(spriteSdfLarge, maxScale / scale);
	const spriteImage = renderSDFSprite(spriteSdf);
	const spriteResult = new Sprite(spriteImage, `sprites${suffix}`);
	await spriteResult.saveToDisk(dirTarget);
	await spriteResult.saveToTar(pack);
}

pack.finalize();
pack
	.pipe(createGzip({ level: 9 }))
	.pipe(createWriteStream(resolve(dirTarget, 'sprites.tar.gz')));

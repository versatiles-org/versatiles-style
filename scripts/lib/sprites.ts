import sharp from 'sharp';
import type { Icon } from './icons.js';
import pack from 'bin-pack';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Pack as TarPack } from 'tar-stream';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

export function buildSpriteEntries(icons: Icon[], scale: number, padding: number): SpriteEntry[] {
	return icons.map(icon => {
		const wResult = /<svg[^>]+width="([^"]+)"/.exec(icon.svg);
		const hResult = /<svg[^>]+height="([^"]+)"/.exec(icon.svg);
		if (!wResult) throw Error();
		if (!hResult) throw Error();
		const w0 = parseFloat(wResult[1]);
		const h0 = parseFloat(hResult[1]);

		if (!w0 || !h0) throw Error();

		const height: number = Math.round(icon.size) * scale;
		const width: number = Math.round(icon.size * w0 / h0) * scale;

		const svg = icon.svg
			.replace(/(<svg[^>]*width=")([^"]+)/, (all, before: string) => before + width)
			.replace(/(<svg[^>]*height=")([^"]+)/, (all, before: string) => before + height);

		return {
			name: icon.name,
			offset: padding * scale,
			svg,
			width: width + 2 * padding * scale,
			height: height + 2 * padding * scale,
			x: 0,
			y: 0,
			pixelRatio: scale,
		};
	});
}

export async function buildSprite(spriteEntries: SpriteEntry[]): Promise<SpriteRGBA> {
	const dimensions = pack(spriteEntries, { inPlace: true });

	const buffer = await sharp({
		create: {
			width: dimensions.width,
			height: dimensions.height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	}).composite(
		spriteEntries.map(spriteEntry => ({
			input: Buffer.from(spriteEntry.svg),
			left: spriteEntry.x + spriteEntry.offset,
			top: spriteEntry.y + spriteEntry.offset,
		})),
	).raw().toBuffer();

	return {
		entries: spriteEntries,
		width: dimensions.width,
		height: dimensions.height,
		buffer,
	};
}

export class Sprite {
	private readonly sprite: SpriteRGBA;

	private buffer?: Buffer;

	private readonly basename: string;

	public constructor(sprite: SpriteRGBA, basename: string) {
		this.sprite = sprite;
		this.basename = basename;
	}

	public async saveToDisk(folder: string): Promise<void> {
		writeFileSync(resolve(folder, this.basename + '.png'), await this.getPng());
		writeFileSync(resolve(folder, this.basename + '.json'), await this.getJSON());
	}

	public async saveToTar(tarPack: TarPack): Promise<void> {
		tarPack.entry({ name: this.basename + '.png' }, await this.getPng());
		tarPack.entry({ name: this.basename + '.json' }, await this.getJSON());
	}

	private async getPng(): Promise<Buffer> {
		if (this.buffer) return this.buffer;
		const { width, height, buffer } = this.sprite;
		const pngBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png({ palette: false }).toBuffer();
		this.buffer = optipng(pngBuffer);
		return this.buffer;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async getJSON(): Promise<Buffer> {
		const { entries } = this.sprite;
		let json = entries.map(e => '  "' + e.name + '": ' + JSON.stringify({
			width: e.width,
			height: e.height,
			x: e.x,
			y: e.y,
			pixelRatio: e.pixelRatio,
			sdf: true,
		})).join(',\n');
		json = `{\n${json}\n}`;
		return Buffer.from(json, 'utf8');
	}
}


export interface SpriteEntry {
	name: string;
	svg: string;
	x: number;
	y: number;
	offset: number;
	width: number;
	height: number;
	pixelRatio: number;
}

export interface SpriteRGBA {
	entries: SpriteEntry[];
	width: number;
	height: number;
	buffer: Buffer;
}

function optipng(bufferIn: Buffer): Buffer {
	const randomString = Math.random().toString(36).replace(/[^a-z0-9]/g, '');
	const filename = resolve(tmpdir(), randomString + '.png');
	writeFileSync(filename, bufferIn);
	spawnSync('optipng', [filename]);
	const bufferOut = readFileSync(filename);
	rmSync(filename);
	return bufferOut;
}


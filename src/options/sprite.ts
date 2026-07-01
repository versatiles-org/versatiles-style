import { resolveUrl, basename } from '../lib/utils.js';

export type SpriteEntry = { id: string; url: string };
export type SpriteInput = string | SpriteEntry[];

export function resolveSprite(base: string, sprite?: SpriteInput): SpriteEntry[] {
	const input = sprite ?? [{ id: 'basics', url: '/assets/sprites/basics/sprites' }];
	if (typeof input === 'string') {
		return [{ id: basename(input), url: resolveUrl(base, input) }];
	}
	return input.map(({ id, url }) => ({ id, url: resolveUrl(base, url) }));
}

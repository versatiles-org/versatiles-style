import { resolveUrl } from '../lib/utils.js';

export type SpriteEntries = string | { id: string; url: string }[];

export function resolveSprite(base: string, sprite?: SpriteEntries): SpriteEntries {
	const input = sprite ?? [{ id: 'base', url: '/assets/sprites/base/sprites' }];
	if (typeof input === 'string') {
		return resolveUrl(base, input);
	}
	return input.map(({ id, url }) => ({ id, url: resolveUrl(base, url) }));
}

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadIcons(sets: Sets, dirIcons: string): Icon[] {
	const icons: Icon[] = [];
	for (const [setName, iconSet] of Object.entries(sets)) {
		if (iconSet.names === undefined || iconSet.size === undefined) continue;

		const { size } = iconSet;
		const folder = resolve(dirIcons, setName);
		for (const iconName of iconSet.names) {
			const filename = resolve(folder, iconName + '.svg');
			if (!existsSync(filename)) throw Error('icon not found: ' + filename);
			const svg = readFileSync(filename, 'utf8');
			icons.push({ setName, iconName, size, svg });
		}
	}
	return icons;
}

export type Sets = Record<string, {
	size?: number;
	names?: string[];
}>;

export interface Icon {
	setName: string;
	iconName: string;
	size: number;
	svg: string;
}

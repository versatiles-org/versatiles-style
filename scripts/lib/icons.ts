import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export class Icon {
	public readonly name: string;

	public readonly size: number;

	public readonly svg: string;

	public constructor(options: { name: string; size: number; filename: string }) {
		this.name = options.name;
		this.size = options.size;

		const { filename } = options;
		if (!existsSync(filename)) throw Error('icon not found: ' + filename);
		this.svg = readFileSync(filename, 'utf8');
	}
}

export type IconSets = Record<string, {
	size?: number;
	names?: string[];
}>;

export function loadIcons(iconSets: IconSets, dirIcons: string): Icon[] {
	const icons: Icon[] = [];
	for (const [setName, iconSet] of Object.entries(iconSets)) {
		if (iconSet.names === undefined || iconSet.size === undefined) continue;

		const { size } = iconSet;
		const folder = resolve(dirIcons, setName);
		for (const iconName of iconSet.names) {
			const filename = resolve(folder, iconName + '.svg');
			icons.push(new Icon({ name: `${setName}-${iconName}`, size, filename }));
		}
	}
	return icons;
}


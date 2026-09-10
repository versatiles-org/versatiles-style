import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export class Icon {
	public readonly name: string;
	public readonly size: number;
	public readonly svg: string;
	public readonly useSDF: boolean;
	/** Source path the SVG was loaded from, e.g. `maki/alcohol-shop` — provenance, for reports. */
	public readonly src: string;

	public constructor(options: { name: string; src: string; filename: string; size: number; useSDF?: boolean }) {
		this.name = options.name;
		this.src = options.src;
		this.size = options.size;
		this.useSDF = options.useSDF ?? true;

		const { filename } = options;
		if (!existsSync(filename)) throw Error('icon not found: ' + filename);
		this.svg = readFileSync(filename, 'utf8');
	}
}

/**
 * One icon in a group: either a bare source path, or that path plus metadata.
 *
 * The key it is stored under is the SPRITE name (the public `<group>-<name>` id); `src` is the file
 * it is drawn from, relative to `icons/` and without the `.svg`. The two are deliberately
 * independent — see the header of config-sprites.ts.
 */
export type IconSpec =
	| string
	| {
			src: string;
			/** Search terms for an icon picker. Not used by the build. */
			tags?: string[];
			/** One-line description for an icon picker. Not used by the build. */
			description?: string;
			/** Other names a picker should also match. Not used by the build. */
			aliases?: string[];
	  };

export type IconSets = Record<
	string,
	{
		useSDF?: boolean;
		size: number;
		icons: Record<string, IconSpec>;
	}
>;

export function iconSrc(spec: IconSpec): string {
	return typeof spec === 'string' ? spec : spec.src;
}

/**
 * Load every icon of a sheet.
 *
 * `dirIcons` is the `icons/` root — NOT a per-sheet folder. Sources are addressed by their path
 * inside it (`maki/alcohol-shop`), so the folder tree reflects provenance while the sprite name
 * comes from the config key.
 */
export function loadIcons(iconSets: IconSets, dirIcons: string): Icon[] {
	const icons: Icon[] = [];
	for (const [setName, iconSet] of Object.entries(iconSets)) {
		if (iconSet.icons === undefined || iconSet.size === undefined) throw Error();

		const { size, useSDF } = iconSet;
		for (const [iconName, spec] of Object.entries(iconSet.icons)) {
			const src = iconSrc(spec);
			icons.push(
				new Icon({
					name: `${setName}-${iconName}`,
					src,
					filename: resolve(dirIcons, src + '.svg'),
					size,
					useSDF,
				})
			);
		}
	}
	return icons;
}

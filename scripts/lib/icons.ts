import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export class Icon {
	public readonly name: string;
	public readonly size: number;
	public readonly svg: string;
	public readonly useSDF: boolean;
	/** Source path the SVG was loaded from, e.g. `maki/alcohol-shop` — provenance, for reports. */
	public readonly src: string;
	/** Picker metadata, published inside the sprite JSON. */
	public readonly title?: string;
	public readonly aliases?: string[];
	public readonly center?: [number, number];

	public constructor(options: {
		name: string;
		src: string;
		filename: string;
		size: number;
		useSDF?: boolean;
		title?: string;
		aliases?: string[];
		center?: [number, number];
	}) {
		this.name = options.name;
		this.src = options.src;
		this.size = options.size;
		this.useSDF = options.useSDF ?? true;
		this.title = options.title;
		this.aliases = options.aliases;
		this.center = options.center;

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
 * independent — see the header of config/sprites.ts.
 */
export type IconSpec =
	| string
	| {
			src: string;
			/** Human-readable label, e.g. `Bicycle`. Published in the sprite JSON. */
			title?: string;
			/** Other names a picker should match, e.g. `bike`. Published in the sprite JSON. */
			aliases?: string[];
			/**
			 * Where the icon points at, as a fraction of its own box with the origin top-left.
			 * Omit for the middle — `[0.5, 1]` is the bottom edge, which is where a map pin's tip
			 * sits. Fractions rather than pixels so the value is identical at 1x and 2x.
			 */
			center?: [number, number];
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

const svgAttr = (svg: string, name: string): number | undefined => {
	const m = new RegExp(`<svg[^>]*\\s${name}="([^"]+)"`).exec(svg);
	const v = m ? parseFloat(m[1]) : NaN;
	return Number.isFinite(v) ? v : undefined;
};

/**
 * Intrinsic size of an SVG, used to derive how wide an icon lands on the sheet.
 *
 * Prefers the `width`/`height` attributes and falls back to the `viewBox`: upstream sets do not
 * agree on this — several Temaki icons ship a viewBox only — and a borrowed file should not have to
 * be edited before it can be packed.
 */
export function svgSize(svg: string, label = 'icon'): { w: number; h: number } {
	let w = svgAttr(svg, 'width');
	let h = svgAttr(svg, 'height');
	if (w === undefined || h === undefined) {
		const vb = /<svg[^>]*\sviewBox="\s*[-\d.eE]+[,\s]+[-\d.eE]+[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)\s*"/.exec(svg);
		if (!vb) throw Error(`${label}: SVG has neither width/height attributes nor a viewBox`);
		w = parseFloat(vb[1]);
		h = parseFloat(vb[2]);
	}
	if (!(w > 0 && h > 0)) throw Error(`${label}: SVG reports a non-positive size (${w}×${h})`);
	return { w, h };
}

/** Force explicit pixel width/height on the root `<svg>`, adding the attributes when absent. */
export function setSvgSize(svg: string, w: number, h: number): string {
	const set = (s: string, name: string, value: number): string =>
		new RegExp(`<svg[^>]*\\s${name}="`).test(s)
			? s.replace(new RegExp(`(<svg[^>]*\\s${name}=")([^"]+)`), (_, before: string) => before + value)
			: s.replace(/<svg\b/, `<svg ${name}="${value}"`);
	return set(set(svg, 'width', w), 'height', h);
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
					...(typeof spec === 'string' ? {} : { title: spec.title, aliases: spec.aliases, center: spec.center }),
				})
			);
		}
	}
	return icons;
}

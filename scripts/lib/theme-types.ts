/**
 * The vocabulary the theme configuration is written in.
 *
 * A leaf module, imported by both sides: `scripts/config/themes.ts` writes values in these shapes and
 * `scripts/lib/theme-generator.ts` derives themes from them. Keeping the types here rather than in
 * either one is what lets the dependency run one way — config never imports the engine, the engine
 * never imports config, and `scripts/generate-themes.ts` puts the two together.
 *
 * The prose lives here too, because what a setting *means* is a fact about the derivation, not about
 * the particular number some theme happens to use.
 */

import type { Palette, ResolvedColors } from '../../src/options/index.js';

/** A per-group multiplier. Groups are decided by key name — see `groupOf` in the generator. */
export interface Scale {
	fill?: number;
	line?: number;
	label?: number;
}

export type Group = keyof Scale;

/** The five palettes; each is a light theme of that name and has a `-dark` theme. */
export type LightTheme = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

export interface ThemeSettings {
	/** Land (and background) of the light theme. The reference keeps its own. */
	land?: string;
	/** Exponent on colorful's contrast against the land, per group: above 1 stronger, below 1 softer. */
	contrast?: Scale;
	/** Chroma as a multiple of colorful's, per group. */
	chroma?: Scale;
	/**
	 * How much of the separation that chroma carried is moved into lightness, 0–1.
	 *
	 * Taking the chroma out of a palette also takes out every distinction hue was making. Colorful's
	 * water sits at 0.75 contrast against the land, but what tells the two apart on screen is blue
	 * against cream, not the brightness step — desaturate both and the coast nearly disappears.
	 *
	 * Above 0, the reference each colour is derived from is first moved away from the land, by this
	 * fraction of its OKLab chroma distance to it, in the direction it already leans. So what colorful
	 * separates by colour, the theme separates by brightness. Only meaningful where `chroma` is 0.
	 */
	decolorize?: number;
	/** Relative luminance of the dark theme's land — distinct per theme, so no two share a background. */
	darkLand: number;
}

// ── fixes ─────────────────────────────────────────────────────────────────────
//
// `ThemeSettings` tunes a whole theme, and only by group: colorful's relationships, scaled. A fix is
// the other axis — a named handful of colours that should deviate from those relationships, in one
// mode and not necessarily the other. "Water darker in light themes, lighter in dark ones" cannot be
// said in a `ThemeSettings`, because the generator's dark branch takes `magnitude(target)` and so
// drops the sign: stronger separation in a light theme and in a dark one point in opposite directions.
//
// A fix is folded into the derivation, never applied to its result. The two keys that are solved
// against another generated colour — `labelWater` over the water, a road over its casing — are
// therefore still correct afterwards: darkening the water moves the target `labelWater` is solved
// against, and it re-solves. Adjusting the output colour instead would leave both sitting on a
// background they were never solved for. That is the whole reason this hooks where it does.
//
// Three adjustments, entering at the three points the derivation offers. `blend` changes the reference
// colour before anything reads it; `chroma` scales the chroma `tint` assigns; `lightness` scales the
// contrast target that lightness is solved for. In that order, so a blended colour can still be
// pushed lighter or more saturated than the wash left it.

/** Multipliers on what the derivation would otherwise use; 1, or absent, changes nothing. */
export interface Adjustment {
	/**
	 * Signed contrast against the background, as a multiple: above 1 lighter, below 1 darker.
	 *
	 * A multiplier rather than a lightness delta because the target is signed — above 1 where a colour
	 * is lighter than its background, below 1 where darker. Multiplying therefore reads the same
	 * whichever side of the land the colour sits on: 0.9 darkens a light theme's water, which sits
	 * below 1, and a dark theme's, which may sit either side. So one number means "darker" in both
	 * modes, and the asymmetry you want is expressed by giving `light` and `dark` different ones.
	 *
	 * It also composes with the rest of the derivation instead of overriding it: a fix bends colorful's
	 * relationship, and the theme's own `contrast` exponent still scales what comes out.
	 */
	lightness?: number;
	/** OKLCh chroma, as a multiple of the theme's own. */
	chroma?: number;
	/**
	 * Mix the colour toward the land, 0–1: 0 leaves it alone, 1 makes it the land exactly.
	 *
	 * The one adjustment that is not a multiplier on the derivation but a change to the colour being
	 * derived, so it is applied to the reference first, before anything reads it — see `blendReference`.
	 * Hue, chroma and the contrast target then all follow from the blended colour, which is what
	 * separates this from `lightness` and `chroma`: those bend one axis each and hold the rest, while a
	 * blend moves all three together, the way washing a colour into its background actually looks.
	 *
	 * Reach for it to make something recede — a land use that should stop competing with what is drawn
	 * on it — where dropping chroma alone would leave it the same brightness, and dropping contrast
	 * alone would leave it the same hue.
	 *
	 * The reference's own alpha is kept: how translucent a colour is says what it hides, not how far it
	 * stands out, and blending toward an opaque land would otherwise quietly make it solid.
	 */
	blend?: number;
}

/** A deliberate deviation from the relationships `colorful` sets, for some colours in some themes. */
export interface Fix {
	/** The colour keys to adjust. Not `land`, `background` or `labelHalo` — see `UNFIXABLE`. */
	keys: readonly string[];
	/**
	 * Applied to the generated light themes.
	 *
	 * Never to `colorful` itself: that palette is hand-written in `src/themes/colorful.ts` and is the
	 * reference every other theme is derived from, so the generator does not produce it and a fix
	 * cannot reach it. To move colorful's own light colours, edit that file — every derived theme
	 * follows, because their targets are measured from it.
	 */
	light?: Adjustment;
	/** Applied to the dark themes, `colorful-dark` included — every one of those is generated. */
	dark?: Adjustment;
	/** Limit to these palettes and their dark themes; by default all five. */
	themes?: readonly LightTheme[];
}

/** Hand-written colours dropped on top of a generated table, bypassing the derivation entirely. */
export type Overrides = Partial<Record<Palette, Partial<ResolvedColors>>>;

/** One row of `npm run generate-themes -- --report`: a colour, and what it is measured against. */
export interface ContrastPair {
	/** How the row is labelled. */
	label: string;
	/** The colour key being measured. */
	fg: string;
	/** What it sits on — `'land'`, or another colour key composited over the land. */
	bg: string;
}

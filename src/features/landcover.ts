import type { StyleSpecification } from '../types/index.js';
import { landcoverLayerOf, type TileSource } from '../options/index.js';
import { buildSourceDescriptor, scaleValue } from '../lib/index.js';

// Land cover under OSM (https://github.com/versatiles-org/landcover-vectors#using-it-with-osm).
//
// The land cover is a layer of its own, `landcover`, with one attribute, `kind`, and is drawn below all
// of OSM: OSM paints over it wherever it has data, and it shows wherever OSM has none. Each of its fills
// is a copy of the finished style's fill for the same kinds, so theme, recolouring and hidden groups
// carry over. The stock layers are not touched.
//
// It comes either as a source of its own or merged into OSM's. The difference is what happens above its
// last zoom. MapLibre overzooms a whole source, not a layer:
//   - A source of its own ends with the land cover, so its tiles overzoom at every zoom above that.
//   - In a merged source the tiles go on, without the land cover. MapLibre floors the zoom to pick a
//     vector tile, so the data lasts until one zoom above the layer's last, and the fill has to be gone
//     by then instead of disappearing at once. Only when the layer reaches the source's last zoom does
//     it overzoom like a source of its own.

const SOURCE_NAME = 'versatiles-landcover';
const SOURCE_LAYER = 'landcover';
/** The land cover's last zoom where no TileJSON says otherwise: landcover-vector ends there. */
const DEFAULT_MAXZOOM = 10;

// Opaque up to z12, where the overzoomed outlines grow coarse, and 25 % from z14 on, so land OSM doesn't
// map keeps a hint of colour.
const overzoomedOpacity = () => ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.25];
const endingOpacity = (maxzoom: number) => ['interpolate', ['linear'], ['zoom'], maxzoom, 1, maxzoom + 1, 0];

// The fully-faded-in opacity of a fill-opacity value that may be a constant number or a
// ['interpolate', ['linear'], ['zoom'], z0, v0, …] zoom ramp. It carries a group's opacity from `layers`.
function fadedInOpacity(value: unknown): number {
	if (typeof value === 'number') return value;
	if (Array.isArray(value) && value[0] === 'interpolate') {
		let max = 0;
		for (let i = 4; i < value.length; i += 2) {
			if (typeof value[i] === 'number') max = Math.max(max, value[i] as number);
		}
		return max;
	}
	return 1; // no opacity set → fully opaque
}

// By content, not identity: options that went through `toCode` or JSON hold two equal objects.
function sameSource(a: TileSource, b: TileSource): boolean {
	return a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
}

export type LandcoverPlacement = {
	/** Per stock fill layer id, the land cover's kinds it draws. The schema's own dialect. */
	kinds: ReadonlyMap<string, readonly string[]>;
	/** The layer to insert the land cover's fills before. */
	beforeId: string;
	/** Where the land cover comes from: another source than `osm`, or the same one if it is merged. */
	source: TileSource;
	/** The style's vector source, under its id in `style.sources`. */
	osm: { id: string; source: TileSource };
};

export function addLandcover(style: StyleSpecification, placement: LandcoverPlacement): void {
	const { kinds, beforeId, source, osm } = placement;
	const merged = sameSource(source, osm.source);
	const tileJSON = typeof source === 'object' ? source : undefined;
	const layerMaxzoom = tileJSON && landcoverLayerOf(tileJSON)?.maxzoom;
	const overzooms = !merged || (layerMaxzoom !== undefined && layerMaxzoom >= (tileJSON?.maxzoom ?? Infinity));
	const maxzoom = layerMaxzoom ?? DEFAULT_MAXZOOM;

	const fills = style.layers.flatMap((layer) => {
		const layerKinds = kinds.get(layer.id);
		if (layerKinds === undefined || layer.type !== 'fill') return [];
		const { minzoom: _, ...rest } = layer;
		const ramp = overzooms ? overzoomedOpacity() : endingOpacity(maxzoom);
		return [
			{
				...rest,
				id: `landcover-${layer.id}`,
				source: merged ? osm.id : SOURCE_NAME,
				'source-layer': SOURCE_LAYER,
				filter: ['in', ['get', 'kind'], ['literal', [...layerKinds]]],
				paint: { ...layer.paint, 'fill-opacity': scaleValue(ramp, fadedInOpacity(layer.paint?.['fill-opacity'])) },
			} as typeof layer,
		];
	});
	// every group hidden: nothing reads the source, so a server without it shouldn't be asked for it
	if (fills.length === 0) return;

	if (!merged) {
		// A TileJSON behind a URL states its own `maxzoom`. Without one MapLibre would assume z22, and ask
		// for tiles that don't exist instead of overzooming.
		const stated = typeof source === 'string' && !source.includes('{z}');
		const extra = stated ? {} : { maxzoom: layerMaxzoom ?? tileJSON?.maxzoom ?? DEFAULT_MAXZOOM };
		style.sources[SOURCE_NAME] = buildSourceDescriptor(
			'vector',
			source,
			extra
		) as StyleSpecification['sources'][string];
	}
	style.layers.splice(
		style.layers.findIndex((layer) => layer.id === beforeId),
		0,
		...fills
	);
}

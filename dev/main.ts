import { inlineSources, osm, satellite, type Palette, type StyleSpecification } from '@versatiles/style';
import { omt } from '@versatiles/style/omt';
import { protomaps } from '@versatiles/style/protomaps';
import type * as MaplibreGL from 'maplibre-gl';
declare const maplibregl: typeof import('maplibre-gl');
// maplibre-gl-inspect is loaded as a global from a CDN in index.html (alongside maplibre-gl).
// `sources` and `render()` are public members; we drive both ourselves, see `collectVectorLayers`.
type Inspect = MaplibreGL.IControl & { sources: Record<string, string[]>; render(): void };
declare const MaplibreInspect: new (options?: Record<string, unknown>) => Inspect;

/**
 * The four things the picker can build.
 *
 * Three of them are the three schemas the library supports, which is the point of this tool: the
 * conformance suites prove a style only reads data its tileset carries, and the invariants prove its
 * layers are gated sanely, but neither has ever put pixels on screen. This is where "does OpenMapTiles
 * actually look like a map" gets answered.
 */
type Base = 'osm' | 'omt' | 'protomaps' | 'satellite';

/**
 * Every schema is served by the dev server's caching tile proxy (see dev/tile-cache.ts), which
 * normalises all three to the same shape: a TileJSON at a local URL. That is what removes PMTiles from
 * the browser entirely — Protomaps is now just another vector source — and what makes a reload fast,
 * because the proxy answers from disk.
 */
const TILE_SOURCE = {
	shortbread: '/tilecache/shortbread/tiles.json',
	omt: '/tilecache/omt/tiles.json',
	protomaps: '/tilecache/protomaps/tiles.json',
} as const;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const baseSelect = $<HTMLSelectElement>('base-select');
const themeSelect = $<HTMLSelectElement>('theme-select');
const buildingsToggle = $<HTMLInputElement>('buildings-toggle');
const terrainToggle = $<HTMLInputElement>('terrain-toggle');
const hillshadeToggle = $<HTMLInputElement>('hillshade-toggle');
const landcoverToggle = $<HTMLInputElement>('landcover-toggle');
const status = $<HTMLDivElement>('status');

// Populate the theme dropdown from the library's palette list. The palettes are schema-neutral, so
// `osm`'s list is every schema's list.
for (const palette of osm.palettes) {
	const option = document.createElement('option');
	option.value = palette;
	option.textContent = palette;
	themeSelect.appendChild(option);
}

// ── Restore control state from URL query parameters ─────────────────────────────
const params = new URLSearchParams(location.search);
const getBool = (key: string): boolean => params.get(key) === '1';
const isBase = (value: string | null): value is Base =>
	value === 'osm' || value === 'omt' || value === 'protomaps' || value === 'satellite';

baseSelect.value = isBase(params.get('base')) ? (params.get('base') as Base) : 'osm';
themeSelect.value = params.get('theme') ?? 'colorful';
buildingsToggle.checked = getBool('buildings3d');
terrainToggle.checked = getBool('terrain');
hillshadeToggle.checked = getBool('hillshade');
landcoverToggle.checked = getBool('landcover');

let map: MaplibreGL.Map | undefined;
let inspect: Inspect | undefined;
let inspecting = false;
// ── Inspect mode ────────────────────────────────────────────────────────────────
// The inspect control discovers a vector source's layer list by fetching the TileJSON the source's
// `url` points at, and `inlineSources` resolves that reference away — the built style carries `tiles`,
// not `url`. So the documents are read here, off the un-inlined style, and passed in. The proxy's
// TileJSON carries `vector_layers` for all three schemas, so no schema needs special handling.
const vectorLayerCache = new Map<string, Promise<string[]>>();

async function collectVectorLayers(style: StyleSpecification): Promise<Record<string, string[]>> {
	const entries = await Promise.all(
		Object.entries(style.sources).map(async ([id, source]) => {
			if (source.type !== 'vector' || typeof source.url !== 'string') return undefined;
			const { url } = source;
			let layers = vectorLayerCache.get(url);
			if (!layers) {
				layers = fetch(url)
					.then((res) => res.json() as Promise<{ vector_layers?: { id: string }[] }>)
					.then((tileJSON) => (tileJSON.vector_layers ?? []).map((layer) => layer.id));
				vectorLayerCache.set(url, layers);
			}
			return [id, await layers] as const;
		})
	);
	return Object.fromEntries(entries.filter((entry) => entry !== undefined));
}

// The control's own inspect-style builder drops every source that is not vector or geojson but
// leaves `terrain` in place, and MapLibre throws on a terrain block whose raster-dem source is
// gone. Build the style here so the two stay consistent.
function buildInspectStyle(
	style: StyleSpecification,
	coloredLayers: MaplibreGL.LayerSpecification[],
	options: { backgroundColor: string }
): StyleSpecification {
	const inspectStyle: StyleSpecification = {
		...style,
		sources: Object.fromEntries(
			Object.entries(style.sources).filter(([, source]) => source.type === 'vector' || source.type === 'geojson')
		),
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': options.backgroundColor } },
			...coloredLayers,
		],
	};
	delete inspectStyle.terrain;
	return inspectStyle;
}

/** Which controls mean anything for the chosen base map. */
function applyControlAvailability(base: Base): void {
	const isSatellite = base === 'satellite';
	// `features.landcover` is a Shortbread tileset extension; the other two schemas reject the option
	// outright, so it is not merely inert there.
	landcoverToggle.disabled = base !== 'osm';
	buildingsToggle.disabled = isSatellite;
}

// Build a style from the current control values.
async function buildStyle(): Promise<{ style: StyleSpecification; sources: Record<string, string[]>; note: string }> {
	const base = baseSelect.value as Base;
	const theme = themeSelect.value as Palette;
	const buildings = buildingsToggle.checked ? 'extruded' : 'flat';
	const terrain = terrainToggle.checked;
	const hillshade = hillshadeToggle.checked;
	const landcover = landcoverToggle.checked;

	applyControlAvailability(base);

	let style: StyleSpecification;
	let note: string;
	switch (base) {
		case 'satellite':
			style = satellite({
				osmOverlay: { theme },
				features: { terrain, hillshade },
				urls: { osm: TILE_SOURCE.shortbread },
			});
			note = 'satellite + Shortbread overlay';
			break;
		case 'omt':
			style = omt({ theme, features: { terrain, hillshade, buildings }, urls: { omt: TILE_SOURCE.omt } });
			note = 'OpenMapTiles (OpenFreeMap)';
			break;
		case 'protomaps':
			style = protomaps({
				theme,
				features: { terrain, hillshade, buildings },
				urls: { protomaps: TILE_SOURCE.protomaps },
			});
			note = 'Protomaps (daily build)';
			break;
		default:
			style = osm({
				theme,
				features: { terrain, hillshade, landcover, buildings },
				urls: { osm: TILE_SOURCE.shortbread },
			});
			note = 'Shortbread (VersaTiles)';
			break;
	}

	const sources = await collectVectorLayers(style);

	// The proxy's TileJSON already carries an absolute `tiles` template, so inlining is not strictly
	// needed — but it keeps one fetch out of MapLibre's critical path and makes the logged style
	// self-contained, which is handy when copying one out of the console.
	return { style: await inlineSources(style), sources, note };
}

function persistState(): void {
	const url = new URL(location.href);
	const p = url.searchParams;
	p.set('base', baseSelect.value);
	p.set('theme', themeSelect.value);
	p.set('buildings3d', buildingsToggle.checked ? '1' : '0');
	p.set('terrain', terrainToggle.checked ? '1' : '0');
	p.set('hillshade', hillshadeToggle.checked ? '1' : '0');
	p.set('landcover', landcoverToggle.checked ? '1' : '0');
	history.replaceState(null, '', url);
}

/** What is on screen, and what went wrong if nothing is. */
function showStatus(parts: { note: string; style: StyleSpecification; sources: Record<string, string[]> }): void {
	const { note, style, sources } = parts;
	const sourceIds = Object.keys(style.sources);
	const layerCount = style.layers.length;
	const sourceLayers = Object.values(sources)[0]?.length ?? 0;
	status.innerHTML =
		`<div>${note} — <b>${layerCount}</b> layers, ${sourceLayers} source-layers</div>` +
		`<div><code>${sourceIds.join(', ')}</code></div>`;
}

function showError(error: unknown): void {
	// A style that throws leaves the previous map on screen, which is misleading without this.
	status.innerHTML = `<div class="err">Style failed</div><div><code>${String(error)}</code></div>`;
	console.error(error);
}

async function render(): Promise<void> {
	let built;
	try {
		built = await buildStyle();
	} catch (error) {
		showError(error);
		return;
	}
	const { style, sources, note } = built;

	console.log('Rendering style', style);
	showStatus({ note, style, sources });

	// Tile-level failures (a 404 archive, a CORS refusal) surface here rather than as an exception.
	const onMapError = (event: { error?: { message?: string } }) => {
		if (event.error?.message) showError(event.error.message);
	};

	if (map && inspect) {
		inspect.sources = sources;
		// `diff: false` forces a full reload. With MapLibre's default diffing the rebuilt style is
		// applied to the model — `map.getStyle()` is correct — but tiles already parsed keep the
		// buckets they were built with, so a layer that was outside its zoom range (or absent) when
		// they loaded stays invisible until something forces a re-parse. Toggling `landcover` is
		// exactly that case, and so is switching schema: the sources differ entirely.
		map.setStyle(style, { diff: false });
		if (inspecting) {
			// That `setStyle` also replaced the inspect view with the plain style, so put it back. Wait
			// for `idle` rather than `styledata`: the control picks the new style up as the one to
			// restore on toggle-off on `styledata` (it registered that listener first), but swapping the
			// style again from inside that event re-enters MapLibre's own style loading and throws.
			map.once('idle', () => inspect?.render());
		}
	} else {
		map = new maplibregl.Map({
			container: 'map',
			style,
			maxZoom: 20,
			hash: true,
			maxPitch: 90,
			zoom: 2,
			center: [10, 30],
		});
		map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
		// Inspect control: toggles a debug view of the vector tile layers/features.
		inspect = new MaplibreInspect({
			popup: new maplibregl.Popup({ closeButton: false, closeOnClick: false }),
			sources,
			buildInspectStyle,
			toggleCallback: (on: boolean) => {
				inspecting = on;
			},
		});
		map.addControl(inspect, 'top-right');
		map.on('error', onMapError);
	}

	persistState();
}

for (const control of [baseSelect, themeSelect, buildingsToggle, terrainToggle, hillshadeToggle, landcoverToggle]) {
	control.addEventListener('change', () => void render());
}

void render();

import { inlineSources, osm, satellite, type Palette, type StyleSpecification } from '@versatiles/style';
import type { LayerSpecification } from 'maplibre-gl';
declare const maplibregl: typeof import('maplibre-gl');
// maplibre-gl-inspect is loaded as a global from a CDN in index.html (alongside maplibre-gl).
// `sources` and `render()` are public members; we drive both ourselves, see `collectVectorLayers`.
type Inspect = maplibregl.IControl & { sources: Record<string, string[]>; render(): void };
declare const MaplibreInspect: new (options?: Record<string, unknown>) => Inspect;

type Base = 'osm' | 'satellite';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const baseSelect = $<HTMLSelectElement>('base-select');
const themeSelect = $<HTMLSelectElement>('theme-select');
const buildingsToggle = $<HTMLInputElement>('buildings-toggle');
const terrainToggle = $<HTMLInputElement>('terrain-toggle');
const hillshadeToggle = $<HTMLInputElement>('hillshade-toggle');
const landcoverToggle = $<HTMLInputElement>('landcover-toggle');

// Populate the theme dropdown from the library's palette list.
for (const palette of osm.palettes) {
	const option = document.createElement('option');
	option.value = palette;
	option.textContent = palette;
	themeSelect.appendChild(option);
}

// ── Restore control state from URL query parameters ─────────────────────────────
const params = new URLSearchParams(location.search);
const getBool = (key: string): boolean => params.get(key) === '1';

baseSelect.value = params.get('base') === 'satellite' ? 'satellite' : 'osm';
themeSelect.value = params.get('theme') ?? 'colorful';
buildingsToggle.checked = getBool('buildings3d');
terrainToggle.checked = getBool('terrain');
hillshadeToggle.checked = getBool('hillshade');
landcoverToggle.checked = getBool('landcover');

let map: maplibregl.Map | undefined;
let inspect: Inspect | undefined;
let inspecting = false;

// ── Inspect mode ────────────────────────────────────────────────────────────────
// The inspect control discovers a vector source's layer list by fetching the TileJSON that the
// source's `url` points at. `inlineSources` resolves that reference away — the built style
// carries `tiles`, not `url` — so the control skips every source, ends up with an empty layer
// list and renders a blank inspect view. Read the documents here and pass the result in as its
// `sources` option instead (which also stops it from trying to discover them itself).
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
	coloredLayers: LayerSpecification[],
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

// Build a style from the current control values. Landcover only exists for the OSM vector
// style; for satellite, the theme applies to the (optional) OSM overlay and terrain/hillshade
// apply to the raster style.
async function buildStyle(): Promise<{ style: StyleSpecification; sources: Record<string, string[]> }> {
	const base = baseSelect.value as Base;
	const palette = themeSelect.value as Palette;
	const buildings = buildingsToggle.checked ? 'extruded' : 'flat';
	const terrain = terrainToggle.checked;
	const hillshade = hillshadeToggle.checked;
	const landcover = landcoverToggle.checked;

	// Disable controls that have no effect on the current base map (satellite has no
	// building or landcover layers of its own).
	const isSatellite = base === 'satellite';
	landcoverToggle.disabled = isSatellite;
	buildingsToggle.disabled = isSatellite;

	const style = isSatellite
		? satellite({
				osmOverlay: { theme: palette },
				features: { terrain, hillshade },
			})
		: osm({
				theme: palette,
				features: { terrain, hillshade, landcover, buildings },
			});

	// `osm()`/`satellite()` reference their sources by TileJSON URL and do no I/O, so MapLibre
	// fetches the document itself. That is fine only when the TileJSON's `tiles` entries are
	// absolute — the VersaTiles one serves `/tiles/osm/{z}/{x}/{y}`, and MapLibre does not resolve
	// relative templates, so it builds `Request('/tiles/osm/2/2/2')` and throws. `inlineSources`
	// fetches the document and rewrites those paths against it. The inspect control needs the same
	// documents, so read both off the un-inlined style in one go.
	const [inlined, sources] = await Promise.all([inlineSources(style), collectVectorLayers(style)]);
	return { style: inlined, sources };
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

async function render(): Promise<void> {
	const { style, sources } = await buildStyle();

	console.log('Rendering style', style);

	if (map && inspect) {
		inspect.sources = sources;
		// `diff: false` forces a full reload. With MapLibre's default diffing the rebuilt style is
		// applied to the model — `map.getStyle()` is correct — but tiles already parsed keep the
		// buckets they were built with, so a layer that was outside its zoom range (or absent) when
		// they loaded stays invisible until something forces a re-parse. Toggling `landcover` is
		// exactly that case: it removes each covered fill's `minzoom`, and the loaded tiles carry no
		// bucket for those layers, so forest and grass only appear after a reload.
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
	}

	persistState();
}

for (const control of [baseSelect, themeSelect, buildingsToggle, terrainToggle, hillshadeToggle, landcoverToggle]) {
	control.addEventListener('change', () => void render());
}

void render();

import { osm, satellite, type Palette, type StyleSpecification } from '@versatiles/style';
declare const maplibregl: typeof import('maplibre-gl');
// maplibre-gl-inspect is loaded as a global from a CDN in index.html (alongside maplibre-gl).
declare const MaplibreInspect: new (options?: Record<string, unknown>) => maplibregl.IControl;

type Base = 'osm' | 'satellite';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const baseSelect = $<HTMLSelectElement>('base-select');
const themeSelect = $<HTMLSelectElement>('theme-select');
const buildingsToggle = $<HTMLInputElement>('buildings-toggle');
const darkToggle = $<HTMLInputElement>('dark-toggle');
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
darkToggle.checked = getBool('dark');
terrainToggle.checked = getBool('terrain');
hillshadeToggle.checked = getBool('hillshade');
landcoverToggle.checked = getBool('landcover');

let map: maplibregl.Map | undefined;

// Build a style from the current control values. Landcover only exists for the OSM vector
// style; for satellite, theme/dark-mode apply to the (optional) OSM overlay and terrain/hillshade
// apply to the raster style.
function buildStyle(): Promise<StyleSpecification> {
	const base = baseSelect.value as Base;
	const palette = themeSelect.value as Palette;
	const buildings = buildingsToggle.checked ? 'extruded' : 'flat';
	const darkMode = darkToggle.checked;
	const terrain = terrainToggle.checked;
	const hillshade = hillshadeToggle.checked;
	const landcover = landcoverToggle.checked;

	// Disable controls that have no effect on the current base map (satellite has no
	// building or landcover layers of its own).
	const isSatellite = base === 'satellite';
	landcoverToggle.disabled = isSatellite;
	buildingsToggle.disabled = isSatellite;

	if (isSatellite) {
		return satellite({
			osmOverlay: { theme: { palette, darkMode } },
			features: { terrain, hillshade },
		});
	}
	return osm({
		theme: { palette, darkMode },
		features: { terrain, hillshade, landcover, buildings },
	});
}

function persistState(): void {
	const url = new URL(location.href);
	const p = url.searchParams;
	p.set('base', baseSelect.value);
	p.set('theme', themeSelect.value);
	p.set('buildings3d', buildingsToggle.checked ? '1' : '0');
	p.set('dark', darkToggle.checked ? '1' : '0');
	p.set('terrain', terrainToggle.checked ? '1' : '0');
	p.set('hillshade', hillshadeToggle.checked ? '1' : '0');
	p.set('landcover', landcoverToggle.checked ? '1' : '0');
	history.replaceState(null, '', url);
}

async function render(): Promise<void> {
	const style = await buildStyle();

	console.log('Rendering style', style);

	if (map) {
		map.setStyle(style);
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
		map.addControl(
			new MaplibreInspect({
				popup: new maplibregl.Popup({ closeButton: false, closeOnClick: false }),
			}),
			'top-right'
		);
	}

	persistState();
}

for (const control of [
	baseSelect,
	themeSelect,
	buildingsToggle,
	darkToggle,
	terrainToggle,
	hillshadeToggle,
	landcoverToggle,
]) {
	control.addEventListener('change', () => void render());
}

void render();

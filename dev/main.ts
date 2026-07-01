import { getStyleVariants, osm } from '@versatiles/style';
declare const maplibregl: typeof import('maplibre-gl');
// maplibre-gl-inspect is loaded as a global from a CDN in index.html (alongside maplibre-gl).
declare const MaplibreInspect: new (options?: Record<string, unknown>) => maplibregl.IControl;

const variants = getStyleVariants();
variants.push({
	name: 'custom',
	build: () =>
		osm({
			features: { landcover: true },
		}),
});
const styleSelect = document.getElementById('style-select') as HTMLSelectElement;

// Populate select from variants
for (const { name } of variants) {
	const option = document.createElement('option');
	option.value = name;
	option.textContent = name;
	styleSelect.appendChild(option);
}

// Restore style from URL query parameter
const params = new URLSearchParams(location.search);
const initialStyle = params.get('style') ?? 'colorful/style';
styleSelect.value = initialStyle;

let map: maplibregl.Map | undefined;

async function loadStyle(name: string) {
	const variant = variants.find((v) => v.name === name);
	if (!variant) return;
	const style = await variant.build();
	console.log(style.layers.length);

	if (map) {
		map.setStyle(style);
	} else {
		map = new maplibregl.Map({
			container: 'map',
			style,
			maxZoom: 20,
			hash: true,
			minPitch: 0,
		});
		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		// Inspect control: toggles a debug view of the vector tile layers/features.
		map.addControl(
			new MaplibreInspect({
				popup: new maplibregl.Popup({ closeButton: false, closeOnClick: false }),
			}),
			'top-right'
		);
	}

	// Persist style choice in query parameter
	const url = new URL(location.href);
	url.searchParams.set('style', name);
	history.replaceState(null, '', url);
}

styleSelect.addEventListener('change', () => {
	loadStyle(styleSelect.value);
});

loadStyle(initialStyle);

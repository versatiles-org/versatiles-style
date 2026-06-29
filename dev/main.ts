import { getStyleVariants, osm } from '@versatiles/style';
declare const maplibregl: typeof import('maplibre-gl');

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
	//const style = variant.build();
	const style = osm({
		urls: { base: 'https://tiles.versatiles.org' },
		features: { landcover: true },
	});
	console.log(style);

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

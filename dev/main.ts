import { styles } from '@versatiles/style';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const maplibregl: any;

type StyleName = keyof typeof styles;

const styleSelect = document.getElementById('style-select') as HTMLSelectElement;

// Restore style from URL query parameter
const params = new URLSearchParams(location.search);
const initialStyle = (params.get('style') ?? 'colorful') as StyleName;
styleSelect.value = initialStyle;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any;

async function loadStyle(name: StyleName) {
	const buildFn = styles[name];
	const style = await buildFn();
	console.log(`Style "${name}":`, style);

	if (map) {
		map.setStyle(style);
	} else {
		map = new maplibregl.Map({
			container: 'map',
			style,
			maxZoom: 20,
			hash: true,
		});
	}

	// Persist style choice in query parameter
	const url = new URL(location.href);
	url.searchParams.set('style', name);
	history.replaceState(null, '', url);
}

styleSelect.addEventListener('change', () => {
	loadStyle(styleSelect.value as StyleName);
});

loadStyle(initialStyle);

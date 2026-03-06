import { styles } from '@versatiles/style';

declare const maplibregl: typeof import('maplibre-gl');

type StyleName = keyof typeof styles;

const styleSelect = document.getElementById('style-select') as HTMLSelectElement;

// Restore style from URL hash or default to "colorful"
const params = new URLSearchParams(location.hash.replace(/^#/, '').replace(/^[^?]*/, ''));
const initialStyle = (params.get('style') ?? 'colorful') as StyleName;
styleSelect.value = initialStyle;

let map: InstanceType<typeof maplibregl.Map> | undefined;

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
			hash: 'pos',
		});
	}

	// Persist style choice in hash
	const hash = location.hash || '#';
	const [positionPart] = hash.replace(/^#/, '').split('?');
	location.hash = `${positionPart}?style=${name}`;
}

styleSelect.addEventListener('change', () => {
	loadStyle(styleSelect.value as StyleName);
});

loadStyle(initialStyle);



import type { TileJSONSpecification, TileJSONSpecificationBasic, MaplibreStyle, TileJSONSpecificationRaster, TileJSONSpecificationVector, VectorLayer } from '../types/index.js';
import { isTileJSONSpecification, isVectorLayers } from '../types/index.js';
import { resolveUrl } from '../lib/utils.js';
import type { BackgroundLayerSpecification, CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Container } from '@versatiles/container';
import randomColorGenerator from './random_color.js';
import { colorful } from '../styles/index.js';
import type { GuessContainerOptions, GuessStyleOptions } from './types.js';

export function guessStyle(opt: GuessStyleOptions): MaplibreStyle {
	const { format } = opt;
	const tilejsonBasic: TileJSONSpecificationBasic = {
		tilejson: '3.0.0',
		attribution: opt.attribution,
		tiles: opt.tiles,
		scheme: opt.scheme,
		bounds: opt.bounds,
		center: opt.center,
		description: opt.description,
		fillzoom: opt.fillzoom,
		grids: opt.grids,
		legend: opt.legend,
		minzoom: opt.minzoom,
		maxzoom: opt.maxzoom,
		name: opt.name,
		template: opt.template,
	};

	const { baseUrl } = opt;
	if (typeof baseUrl === 'string') {
		tilejsonBasic.tiles = tilejsonBasic.tiles.map(url => resolveUrl(baseUrl, url));
	}

	let k: keyof typeof tilejsonBasic;
	for (k in tilejsonBasic) {

		if (tilejsonBasic[k] === undefined) delete tilejsonBasic[k];
	}

	let tilejson: TileJSONSpecification;
	let vectorLayers: unknown[] | undefined;
	switch (format) {
		case 'avif':
		case 'jpg':
		case 'png':
		case 'webp':
			tilejson = { ...tilejsonBasic, type: 'raster', format };
			break;
		case 'pbf':
			vectorLayers = opt.vectorLayers;
			if (!isVectorLayers(vectorLayers)) throw Error('property vector_layers is invalid');
			tilejson = { ...tilejsonBasic, type: 'vector', format, vector_layers: vectorLayers };
			break;
		default:
			throw Error(`format "${String(format)}" is not supported`);
	}

	if (!isTileJSONSpecification(tilejson)) throw Error();

	let style: MaplibreStyle;
	switch (tilejson.type) {
		case 'raster':
			style = getImageStyle(tilejson);
			break;
		case 'vector':
			if (isShortbread(tilejson)) {
				style = getShortbreadStyle(tilejson, opt);
			} else {
				style = getInspectorStyle(tilejson);
			}
	}

	if (opt.minzoom ?? 0) style.zoom ??= opt.minzoom;
	if (opt.bounds) style.center ??= [
		(opt.bounds[0] + opt.bounds[2]) / 2,
		(opt.bounds[1] + opt.bounds[3]) / 2,
	];
	if (opt.center) style.center = opt.center;

	return style;
}

export async function guessStyleFromContainer(container: Container, options: GuessContainerOptions): Promise<MaplibreStyle> {
	const header = await container.getHeader();
	const metadata = await container.getMetadata();

	const format = header.tileFormat;

	switch (format) {
		case 'avif':
		case 'jpg':
		case 'pbf':
		case 'png':
		case 'webp':
			break;
		default:
			throw Error(`format "${String(format)}" is not supported`);
	}

	let vectorLayers;
	if (typeof metadata === 'string') {
		try {
			const t = JSON.parse(metadata) as object;
			if (('vector_layers' in t) && Array.isArray(t.vector_layers)) vectorLayers = t.vector_layers;
		} catch (error) {
			console.log(error);
		}
	}

	const guessStyleOptions: GuessStyleOptions = {
		...options,
		format,
		bounds: header.bbox,
		minzoom: header.zoomMin,
		maxzoom: header.zoomMax,
		vectorLayers,
	};

	return guessStyle(guessStyleOptions);
}

function isShortbread(spec: TileJSONSpecificationVector): boolean {
	if (typeof spec !== 'object') return false;
	if (!('vector_layers' in spec)) return false;
	if (!Array.isArray(spec.vector_layers)) return false;


	const layerIds = new Set(spec.vector_layers.map(l => String(l.id)));
	const shortbreadIds = ['place_labels', 'boundaries', 'boundary_labels', 'addresses', 'water_lines', 'water_lines_labels', 'dam_lines', 'dam_polygons', 'pier_lines', 'pier_polygons', 'bridges', 'street_polygons', 'streets_polygons_labels', 'ferries', 'streets', 'street_labels', 'street_labels_points', 'aerialways', 'public_transport', 'buildings', 'water_polygons', 'ocean', 'water_polygons_labels', 'land', 'sites', 'pois'];
	return shortbreadIds.every(id => layerIds.has(id));
}

function getShortbreadStyle(spec: TileJSONSpecificationVector, builderOption: { baseUrl?: string; glyphs?: string; sprite?: string }): MaplibreStyle {
	return colorful({
		hideLabels: true,
		tiles: spec.tiles,
		baseUrl: builderOption.baseUrl,
		glyphs: builderOption.glyphs,
		sprite: builderOption.sprite,
	});
}

function getInspectorStyle(spec: TileJSONSpecificationVector): MaplibreStyle {
	const sourceName = 'vectorSource';

	const layers: {
		background: BackgroundLayerSpecification[];
		circle: CircleLayerSpecification[];
		line: LineLayerSpecification[];
		fill: FillLayerSpecification[];
	} = { background: [], circle: [], line: [], fill: [] };

	layers.background.push({ 'id': 'background', 'type': 'background', 'paint': { 'background-color': '#fff' } });

	const randomColor = randomColorGenerator();

	spec.vector_layers.forEach((vector_layer: VectorLayer) => {
		let luminosity = 'bright', saturation, hue;

		if (/water|ocean|lake|sea|river/.test(vector_layer.id)) hue = 'blue';
		if (/state|country|place/.test(vector_layer.id)) hue = 'pink';
		if (/road|highway|transport|streets/.test(vector_layer.id)) hue = 'orange';
		if (/contour|building/.test(vector_layer.id)) hue = 'monochrome';
		if (vector_layer.id.includes('building')) luminosity = 'dark';
		if (/contour|landuse/.test(vector_layer.id)) hue = 'yellow';
		if (/wood|forest|park|landcover|land/.test(vector_layer.id)) hue = 'green';

		if (vector_layer.id.includes('point')) {
			saturation = 'strong';
			luminosity = 'light';
		}

		const color = randomColor({
			hue,
			luminosity,
			saturation,
			seed: vector_layer.id,
			opacity: 0.6,
		});

		layers.circle.push({
			id: `${sourceName}-${vector_layer.id}-circle`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'circle',
			filter: ['==', '$type', 'Point'],
			paint: { 'circle-color': color, 'circle-radius': 2 },
		});

		layers.line.push({
			id: `${sourceName}-${vector_layer.id}-line`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'line',
			filter: ['==', '$type', 'LineString'],
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: { 'line-color': color },
		});

		layers.fill.push({
			id: `${sourceName}-${vector_layer.id}-fill`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'fill',
			filter: ['==', '$type', 'Polygon'],
			paint: { 'fill-color': color, 'fill-opacity': 0.3, 'fill-antialias': true, 'fill-outline-color': color },
		});
	});

	return {
		version: 8,
		sources: {
			[sourceName]: spec,
		},
		layers: [
			...layers.background,
			...layers.fill,
			...layers.line,
			...layers.circle,
		],
	};
}

function getImageStyle(spec: TileJSONSpecificationRaster): MaplibreStyle {
	const sourceName = 'rasterSource';
	return {
		version: 8,
		sources: { [sourceName]: spec },
		layers: [{
			id: 'raster',
			type: 'raster',
			source: sourceName,
		}],
	};
}
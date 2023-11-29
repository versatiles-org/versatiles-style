/* eslint-disable @typescript-eslint/prefer-includes */
/* eslint-disable @typescript-eslint/naming-convention */

import type { BackgroundLayerSpecification, CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { MaplibreStyle, TileJSONOption, TileJSONSpecification, TileJSONSpecificationBasic, TileJSONSpecificationRaster, TileJSONSpecificationVector, VectorLayer } from './types.js';
import { isTileJSONSpecification } from './types.js';
import randomColorGenerator from './random_color.js';
import Colorful from '../style/colorful.js';



export default function guess(opt: TileJSONOption): MaplibreStyle {

	const { format } = opt;
	const tilejsonBasic: TileJSONSpecificationBasic = {
		tilejson: opt.tilejson ?? '3.0.0',
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

	let k: keyof typeof tilejsonBasic;
	for (k in tilejsonBasic) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		if (tilejsonBasic[k] === undefined) delete tilejsonBasic[k];
	}

	let tilejson: TileJSONSpecification;
	switch (format) {
		case 'avif':
		case 'jpg':
		case 'png':
		case 'webp':
			tilejson = { ...tilejsonBasic, type: 'raster', format };
			break;
		case 'pbf':
			const { vectorLayers } = opt;
			if (vectorLayers == null) {
				throw Error('property vector_layers is required for vector tiles');
			}
			tilejson = { ...tilejsonBasic, type: 'vector', format, vector_layers: vectorLayers };
			break;
	}

	if (!isTileJSONSpecification(tilejson)) throw Error();

	switch (tilejson.type) {
		case 'raster':
			return getImageStyle(tilejson);
		case 'vector':
			if (isShortbread(tilejson)) {
				return getShortbreadStyle(tilejson, { baseUrl: opt.baseUrl, glyphs: opt.glyphs, sprite: opt.sprite });
			} else {
				return getInspectorStyle(tilejson);
			}
	}
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
	const style = new Colorful().build({
		hideLabels: true,
		tiles: spec.tiles,
		baseUrl: builderOption.baseUrl,
		glyphs: builderOption.glyphs,
		sprite: builderOption.sprite,
	});
	return style;
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
		if (/building/.test(vector_layer.id)) luminosity = 'dark';
		if (/contour|landuse/.test(vector_layer.id)) hue = 'yellow';
		if (/wood|forest|park|landcover|land/.test(vector_layer.id)) hue = 'green';

		if (/point/.test(vector_layer.id)) {
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
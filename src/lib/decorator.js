
import Color from 'color';
import expandBraces from 'brace-expansion';

import LAYERS from './shortbread_layers.js';
import MAPLIBRE_PROPERTIES from './shortbread_properties.js';

import { deepClone } from './utils.js';



const LAYER_IDS = LAYERS.map(l => l.id);
const LAYER_ID_SET = new Set(LAYER_IDS);



export function decorate(rules) {

	// Initialize a new map to hold final styles for layers
	let layerStyles = new Map();

	// Iterate through the generated layer style rules
	Object.entries(rules).forEach(([idDef, layerStyle]) => {
		// Expand any braces in IDs and filter them through a RegExp if necessary
		let ids = expandBraces(idDef).flatMap(id => {
			if (!id.includes('*')) return id;
			let regExp = id.replace(/[^a-z\-:]/g, c => {
				if (c === '*') return '[a-z\-]*';
				throw new Error('unknown char to process. Do not know how to make a RegExp from: ' + JSON.stringify(c));
			})
			regExp = new RegExp(`^${regExp}$`, 'i');
			return LAYER_IDS.filter(layerId => regExp.test(layerId));
		});

		ids.forEach(id => {
			if (!LAYER_ID_SET.has(id)) return;
			layerStyles.set(id, Object.assign(layerStyles.get(id) || {}, layerStyle));
		})
	})

	// Deep clone the original layers and apply styles
	return deepClone(LAYERS).flatMap(layer => {
		// Get the id and style of the layer
		let layerStyle = Object.assign({}, layerStyles.get(layer.id));

		// Don't export layers that have no style
		if (!layerStyle) return [];

		// Set the layer source to the provided sourceName option
		layer.layout = {};
		layer.paint = {};

		processStyling(layer, layerStyle);

		return [layer];
	})
}

// Function to process each style attribute for the layer
function processStyling(layer, style) {

	Object.entries(style).forEach(([key, value]) => {
		// CamelCase to not-camel-case
		key = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

		let propertyDefs = MAPLIBRE_PROPERTIES.get(key);
		if (!propertyDefs) throw new Error('unknown key: ' + key);

		let propertyDef = propertyDefs.get(layer.type);
		if (!propertyDef) return;

		key = propertyDef.key;

		switch (propertyDef.value) {
			case 'color': value = processExpression(value, processColor); break;
			case 'fonts': value = processExpression(value, processFont); break;
			case 'resolvedImage': console.warn('handle resolvedImage'); break;
			case 'formatted':
			case 'array':
			case 'boolean':
			case 'enum':
			case 'number': value = processExpression(value); break;
			default: throw new Error(`unknown type "${propertyDef.type}" for key "${key}"`);
		}

		switch (propertyDef.parent) {
			case 'layer': layer[key] = value; break;
			case 'layout': layer.layout[key] = value; break;
			case 'paint': layer.paint[key] = value; break;
			default: throw new Error(`unknown parent "${propertyDef.parent}" for key "${key}"`);
		}
	})
}

function processColor(value) {
	if (value instanceof Color) return value.hex();
	if (typeof value === 'string') return Color(value).hex();
	throw new Error(`unknown color type "${typeof value}"`);
}

function processFont(value) {
	if (typeof value === 'string') return value;
	throw new Error(`unknown font type "${typeof value}"`);
}

function processExpression(value, cbValue) {
	cbValue ??= v => v;
	if (typeof value === 'object') {
		if (value instanceof Color) return cbValue(value);
		if (!Array.isArray(value)) {
			return processZoomStops(value, cbValue);
		}
	}
	return cbValue(value);
}

function processZoomStops(obj, cbValue) {
	return {
		stops: Object.entries(obj)
			.map(([z, v]) => [parseInt(z, 10), cbValue(v)])
			.sort(([a], [b]) => a - b)
	}
}

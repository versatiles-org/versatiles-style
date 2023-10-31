
import Color from 'color';
import expandBraces from 'brace-expansion';
import MAPLIBRE_PROPERTIES from './shortbread_properties.js';
import { ShortbreadLayer } from './shortbread_layers.js';
import { StyleRule, StyleRules } from './types.js';
import { deepMerge } from './utils.js';



export function decorate(layers: ShortbreadLayer[], rules: StyleRules) {
	const layerIds = layers.map(l => l.id);
	const layerIdSet = new Set(layerIds);

	// Initialize a new map to hold final styles for layers
	let layerStyles: Map<string, StyleRule> = new Map();

	// Iterate through the generated layer style rules
	Object.entries(rules).forEach(([idDef, layerStyle]) => {
		// Expand any braces in IDs and filter them through a RegExp if necessary
		let ids = expandBraces(idDef).flatMap(id => {
			if (!id.includes('*')) return id;
			let regExpString = id.replace(/[^a-z_\-:]/g, c => {
				if (c === '*') return '[a-z_\-]*';
				throw new Error('unknown char to process. Do not know how to make a RegExp from: ' + JSON.stringify(c));
			})
			let regExp = new RegExp(`^${regExpString}$`, 'i');
			return layerIds.filter(layerId => regExp.test(layerId));
		});

		ids.forEach(id => {
			if (!layerIdSet.has(id)) return;
			layerStyles.set(id, deepMerge(layerStyles.get(id) || {}, layerStyle));
		})
	})

	// Deep clone the original layers and apply styles
	return layers.flatMap(layer => {
		// Get the id and style of the layer
		let layerStyle = layerStyles.get(layer.id);

		// Don't export layers that have no style
		if (!layerStyle) return [];

		processStyling(layer, layerStyle);

		return [layer];
	});
}

// Function to process each style attribute for the layer
function processStyling(layer: ShortbreadLayer, styleRule: StyleRule) {

	Object.entries(styleRule).forEach(([ruleKey, ruleValue]) => {
		// CamelCase to not-camel-case
		ruleKey = ruleKey.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

		let propertyDefs = MAPLIBRE_PROPERTIES.get(layer.type + '/' + ruleKey);
		if (!propertyDefs) return;

		propertyDefs.forEach(propertyDef => {
			let key = propertyDef.key;
			let value: any = ruleValue;

			switch (propertyDef.valueType) {
				case 'color': value = processExpression(value, processColor); break;
				case 'fonts': value = processExpression(value, processFont); break;
				case 'resolvedImage':
				case 'formatted':
				case 'array':
				case 'boolean':
				case 'enum':
				case 'number': value = processExpression(value); break;
				default: throw new Error(`unknown propertyDef.valueType "${propertyDef.valueType}" for key "${key}"`);
			}

			switch (propertyDef.parent) {
				case 'layer': layer[key] = value; break;
				case 'layout': layer.layout[key] = value; break;
				case 'paint': layer.paint[key] = value; break;
				default: throw new Error(`unknown parent "${propertyDef.parent}" for key "${key}"`);
			}
		})
	})
}

function processColor(value: any): string {
	if (typeof value === 'string') value = Color(value);
	if (value instanceof Color) {
		value = (value.alpha() === 1) ? value.hex() : value.hexa();
		return value.toLowerCase();
	}
	throw new Error(`unknown color type "${typeof value}"`);
}

function processFont(value: any): string[] {
	if (typeof value === 'string') return [value];
	throw new Error(`unknown font type "${typeof value}"`);
}

function processExpression(value: any, cbValue?: (value: any) => any): any {
	if (typeof value === 'object') {
		cbValue ??= v => v;
		if (value instanceof Color) return cbValue(value);
		if (!Array.isArray(value)) {
			return processZoomStops(value, cbValue);
		}
	}
	return cbValue ? cbValue(value) : value;
}

function processZoomStops(obj: any, cbValue: (value: any) => any): { stops: any[] } {
	return {
		stops: Object.entries(obj)
			.map(([z, v]) => [parseInt(z, 10), cbValue(v)])
			.sort(([a], [b]) => a - b)
	}
}

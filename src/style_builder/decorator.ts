
import { Color } from '../color/index.js';
import expandBraces from 'brace-expansion';
import maplibreProperties from '../tilesets/properties.js';
import { deepMerge } from '../lib/utils.js';
import type { MaplibreLayer } from '../types/index.js';
import type { StyleRule, StyleRuleValue, StyleRules } from './types.js';
import type { CachedRecolor } from './recolor.js';



export function decorate(layers: MaplibreLayer[], rules: StyleRules, recolor: CachedRecolor): MaplibreLayer[] {
	const layerIds = layers.map(l => l.id);
	const layerIdSet = new Set(layerIds);

	// Initialize a new map to hold final styles for layers
	const layerStyles = new Map<string, StyleRule>();

	// Iterate through the generated layer style rules
	Object.entries(rules).forEach(([idDef, layerStyle]) => {
		if (layerStyle == null) return;

		// Expand any braces in IDs and filter them through a RegExp if necessary
		const ids = expandBraces(idDef).flatMap(id => {
			if (!id.includes('*')) return id;
			const regExpString = id.replace(/[^a-z_:-]/g, c => {
				if (c === '*') return '[a-z_-]*';
				throw new Error('unknown char to process. Do not know how to make a RegExp from: ' + JSON.stringify(c));
			});
			const regExp = new RegExp(`^${regExpString}$`, 'i');
			return layerIds.filter(layerId => regExp.test(layerId));
		});

		ids.forEach(id => {
			if (!layerIdSet.has(id)) return;
			layerStyles.set(id, deepMerge(layerStyles.get(id) ?? {}, layerStyle));
		});
	});

	// Deep clone the original layers and apply styles
	return layers.flatMap(layer => {
		// Get the id and style of the layer
		const layerStyle = layerStyles.get(layer.id);

		// Don't export layers that have no style
		if (!layerStyle) return [];

		processStyling(layer, layerStyle);

		return [layer];
	});

	// Function to process each style attribute for the layer
	function processStyling(layer: MaplibreLayer, styleRule: StyleRule): void {

		for (const [ruleKeyCamelCase, ruleValue] of Object.entries(styleRule)) {
			if (ruleValue == null) continue;

			// CamelCase to not-camel-case
			const ruleKey = ruleKeyCamelCase.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

			const propertyDefs = maplibreProperties.get(layer.type + '/' + ruleKey);
			if (!propertyDefs) continue;

			propertyDefs.forEach(propertyDef => {
				const { key } = propertyDef;
				let value: StyleRuleValue = ruleValue;

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
					case 'layer':
						// @ts-expect-error: too complex to handle
						layer[key] = value;
						break;
					case 'layout':
						if (!layer.layout) layer.layout = {};
						// @ts-expect-error: too complex to handle
						layer.layout[key] = value;
						break;
					case 'paint':
						if (!layer.paint) layer.paint = {};
						// @ts-expect-error: too complex to handle
						layer.paint[key] = value;
						break;
					default:
						throw new Error(`unknown parent "${propertyDef.parent}" for key "${key}"`);
				}
			});
		}

		function processColor(value: StyleRuleValue): string | unknown[] {
			if (typeof value === 'string') value = Color.parse(value);

			if (value instanceof Color) {
				const color = recolor.do(value as Color);
				return color.asString()
			}

			// check if conditional thingie
			if (Array.isArray(value) && (value[0] === "case" || value[0] === "interpolate")) {
				return value.map(v => ((v instanceof Color) ? recolor.do(v).asString() : v));
			}

			throw new Error(`unknown color type "${typeof value}"`);
		}

		function processFont(value: StyleRuleValue): string[] {
			if (typeof value === 'string') return [value];
			throw new Error(`unknown font type "${typeof value}"`);
		}

		function processExpression(value: StyleRuleValue, cbValue?: (value: StyleRuleValue) => StyleRuleValue): StyleRuleValue {
			if (typeof value === 'object') {
				if (value instanceof Color) return processColor(value);
				if (!Array.isArray(value)) {
					return processZoomStops(value as Record<string, StyleRuleValue>, cbValue);
				}
			}
			return cbValue ? cbValue(value) : value;
		}

		function processZoomStops(obj: Record<string, StyleRuleValue>, cbValue?: (value: StyleRuleValue) => StyleRuleValue): { stops: StyleRuleValue[] } {
			return {
				stops: Object.entries(obj)
					.map(([z, v]) => [parseInt(z, 10), cbValue ? cbValue(v) : v] as [number, StyleRuleValue])
					.sort((a, b) => a[0] - b[0]),
			};
		}
	}
}
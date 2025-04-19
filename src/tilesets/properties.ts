
export interface TilesetsProperty {
	readonly key: string;
	readonly parent: 'layer' | 'layout' | 'paint';
	readonly valueType: 'array' | 'boolean' | 'color' | 'enum' | 'filter' | 'fonts' | 'formatted' | 'number' | 'padding' | 'resolvedImage' | 'variableAnchorOffsetCollection';
}

type TilesetsPropertyDef = TilesetsProperty & {
	readonly types: string;
	readonly short?: string;
};

const propertyLookup = new Map<string, TilesetsProperty[]>();

const propertyDefs: TilesetsPropertyDef[] = [
	{ parent: 'layer', types: 'background,fill,line,symbol', key: 'filter', valueType: 'filter' },
	{ parent: 'layer', types: 'background,fill,line,symbol', key: 'maxzoom', valueType: 'number' },
	{ parent: 'layer', types: 'background,fill,line,symbol', key: 'minzoom', valueType: 'number' },

	{ parent: 'layout', types: 'background,fill,line,symbol', key: 'visibility', valueType: 'enum' },
	{ parent: 'layout', types: 'fill', key: 'fill-sort-key', valueType: 'number' },
	{ parent: 'layout', types: 'line', key: 'line-cap', valueType: 'enum' },
	{ parent: 'layout', types: 'line', key: 'line-join', valueType: 'enum' },
	{ parent: 'layout', types: 'line', key: 'line-miter-limit', valueType: 'number' },
	{ parent: 'layout', types: 'line', key: 'line-round-limit', valueType: 'number' },
	{ parent: 'layout', types: 'line', key: 'line-sort-key', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'icon-allow-overlap', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'icon-anchor', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'icon-ignore-placement', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'icon-image', short: 'image', valueType: 'resolvedImage' },
	{ parent: 'layout', types: 'symbol', key: 'icon-keep-upright', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'icon-offset', valueType: 'array' },
	{ parent: 'layout', types: 'symbol', key: 'icon-optional', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'icon-overlap', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'icon-padding', valueType: 'padding' },
	{ parent: 'layout', types: 'symbol', key: 'icon-pitch-alignment', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'icon-rotate', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'icon-rotation-alignment', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'icon-size', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'icon-text-fit-padding', valueType: 'array' },
	{ parent: 'layout', types: 'symbol', key: 'icon-text-fit', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-avoid-edges', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-placement', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-sort-key', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-spacing', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-z-order', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-allow-overlap', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'text-anchor', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-field', short: 'text', valueType: 'formatted' },
	{ parent: 'layout', types: 'symbol', key: 'text-font', short: 'font', valueType: 'fonts' },
	{ parent: 'layout', types: 'symbol', key: 'text-ignore-placement', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'text-justify', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-keep-upright', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'text-letter-spacing', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-line-height', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-max-angle', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-max-width', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-offset', valueType: 'array' },
	{ parent: 'layout', types: 'symbol', key: 'text-optional', valueType: 'boolean' },
	{ parent: 'layout', types: 'symbol', key: 'text-overlap', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-padding', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-pitch-alignment', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-radial-offset', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-rotate', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-rotation-alignment', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-size', short: 'size', valueType: 'number' },
	{ parent: 'layout', types: 'symbol', key: 'text-transform', valueType: 'enum' },
	{ parent: 'layout', types: 'symbol', key: 'text-variable-anchor-offset', valueType: 'variableAnchorOffsetCollection' },
	{ parent: 'layout', types: 'symbol', key: 'text-variable-anchor', valueType: 'array' },
	{ parent: 'layout', types: 'symbol', key: 'text-writing-mode', valueType: 'array' },

	{ parent: 'paint', types: 'background', key: 'background-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'background', key: 'background-opacity', short: 'opacity', valueType: 'number' },
	{ parent: 'paint', types: 'background', key: 'background-pattern', short: 'image', valueType: 'resolvedImage' },
	{ parent: 'paint', types: 'fill', key: 'fill-antialias', valueType: 'boolean' },
	{ parent: 'paint', types: 'fill', key: 'fill-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-base', valueType: 'number' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-color', valueType: 'color' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-height', valueType: 'number' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-opacity', valueType: 'number' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-pattern', valueType: 'resolvedImage' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-translate-anchor', valueType: 'enum' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-translate', valueType: 'array' },
	{ parent: 'paint', types: 'fill', key: 'fill-extrusion-vertical-gradient', valueType: 'boolean' },
	{ parent: 'paint', types: 'fill', key: 'fill-opacity', short: 'opacity', valueType: 'number' },
	{ parent: 'paint', types: 'fill', key: 'fill-outline-color', valueType: 'color' },
	{ parent: 'paint', types: 'fill', key: 'fill-pattern', short: 'image', valueType: 'resolvedImage' },
	{ parent: 'paint', types: 'fill', key: 'fill-translate-anchor', valueType: 'enum' },
	{ parent: 'paint', types: 'fill', key: 'fill-translate', valueType: 'array' },
	{ parent: 'paint', types: 'line', key: 'line-blur', valueType: 'number' },
	{ parent: 'paint', types: 'line', key: 'line-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'line', key: 'line-dasharray', valueType: 'array' },
	{ parent: 'paint', types: 'line', key: 'line-gap-width', valueType: 'number' },
	{ parent: 'paint', types: 'line', key: 'line-gradient', valueType: 'color' },
	{ parent: 'paint', types: 'line', key: 'line-offset', valueType: 'number' },
	{ parent: 'paint', types: 'line', key: 'line-opacity', short: 'opacity', valueType: 'number' },
	{ parent: 'paint', types: 'line', key: 'line-pattern', short: 'image', valueType: 'resolvedImage' },
	{ parent: 'paint', types: 'line', key: 'line-translate-anchor', valueType: 'enum' },
	{ parent: 'paint', types: 'line', key: 'line-translate', valueType: 'array' },
	{ parent: 'paint', types: 'line', key: 'line-width', short: 'size', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'icon-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'icon-halo-blur', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'icon-halo-color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'icon-halo-width', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'icon-opacity', short: 'opacity', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'icon-translate-anchor', valueType: 'enum' },
	{ parent: 'paint', types: 'symbol', key: 'icon-translate', valueType: 'array' },
	{ parent: 'paint', types: 'symbol', key: 'text-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-blur', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-width', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'text-opacity', short: 'opacity', valueType: 'number' },
	{ parent: 'paint', types: 'symbol', key: 'text-translate-anchor', valueType: 'enum' },
	{ parent: 'paint', types: 'symbol', key: 'text-translate', valueType: 'array' },
];

propertyDefs.forEach((propertyDef: TilesetsPropertyDef) => {
	const types: string = propertyDef.types;

	types.split(',').forEach((type: string) => {

		function add(propertyKey: string): void {
			const key = type + '/' + propertyKey;
			const property: TilesetsProperty = {
				key: propertyDef.key,
				parent: propertyDef.parent,
				valueType: propertyDef.valueType,
			};
			const propertyList: TilesetsProperty[] | undefined = propertyLookup.get(key);
			if (propertyList) {
				propertyList.push(property);
			} else {
				propertyLookup.set(key, [property]);
			}
		}

		add(propertyDef.key);
		if (propertyDef.short != null) add(propertyDef.short);
	});
});

export default propertyLookup;

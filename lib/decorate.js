// decorates layers

const glob = require("minimatch");

const props = {
	// paint
	"background-color": "paint",
	"background-opacity": "paint",
	"background-pattern": "paint",
	"fill-antialias": "paint",
	"fill-color": "paint",
	"fill-opacity": "paint",
	"fill-outline-color": "paint",
	"fill-pattern": "paint",
	"fill-translate": "paint",
	"fill-translate-anchor": "paint",
	"line-blur": "paint",
	"line-color": "paint",
	"line-dasharray": "paint",
	"line-gap-width": "paint",
	"line-gradient": "paint",
	"line-offset": "paint",
	"line-opacity": "paint",
	"line-pattern": "paint",
	"line-translate": "paint",
	"line-translate-anchor": "paint",
	"line-trim-offset": "paint",
	"line-width": "paint",
	"icon-color": "paint",
	"icon-halo-blur": "paint",
	"icon-halo-color": "paint",
	"icon-halo-width": "paint",
	"icon-opacity": "paint",
	"icon-translate": "paint",
	"icon-translate-anchor": "paint",
	"text-color": "paint",
	"text-halo-blur": "paint",
	"text-halo-color": "paint",
	"text-halo-width": "paint",
	"text-opacity": "paint",
	"text-translate": "paint",
	"text-translate-anchor": "paint",
	"raster-brightness-max": "paint",
	"raster-brightness-min": "paint",
	"raster-contrast": "paint",
	"raster-fade-duration": "paint",
	"raster-hue-rotate": "paint",
	"raster-opacity": "paint",
	"raster-resampling": "paint",
	"raster-saturation": "paint",
	"circle-blur": "paint",
	"circle-color": "paint",
	"circle-opacity": "paint",
	"circle-pitch-alignment": "paint",
	"circle-pitch-scale": "paint",
	"circle-radius": "paint",
	"circle-stroke-color": "paint",
	"circle-stroke-opacity": "paint",
	"circle-stroke-width": "paint",
	"circle-translate": "paint",
	"circle-translate-anchor": "paint",
	"fill-extrusion-base": "paint",
	"fill-extrusion-color": "paint",
	"fill-extrusion-height": "paint",
	"fill-extrusion-opacity": "paint",
	"fill-extrusion-pattern": "paint",
	"fill-extrusion-translate": "paint",
	"fill-extrusion-translate-anchor": "paint",
	"fill-extrusion-vertical-gradient": "paint",
	"heatmap-color": "paint",
	"heatmap-intensity": "paint",
	"heatmap-opacity": "paint",
	"heatmap-radius": "paint",
	"heatmap-weight": "paint",
	"hillshade-accent-color": "paint",
	"hillshade-exaggeration": "paint",
	"hillshade-highlight-color": "paint",
	"hillshade-illumination-anchor": "paint",
	"hillshade-illumination-direction": "paint",
	"hillshade-shadow-color": "paint",
	"sky-atmosphere-color": "paint",
	"sky-atmosphere-halo-color": "paint",
	"sky-atmosphere-sun": "paint",
	"sky-atmosphere-sun-intensity": "paint",
	"sky-gradient": "paint",
	"sky-gradient-center": "paint",
	"sky-gradient-radius": "paint",
	"sky-opacity": "paint",
	"sky-type": "paint",
	// layout
	"visibility": "layout",
	"fill-sort-key": "layout",
	"line-cap": "layout",
	"line-join": "layout",
	"line-miter-limit": "layout",
	"line-round-limit": "layout",
	"line-sort-key": "layout",
	"icon-allow-overlap": "layout",
	"icon-anchor": "layout",
	"icon-ignore-placement": "layout",
	"icon-image": "layout",
	"icon-keep-upright": "layout",
	"icon-offset": "layout",
	"icon-optional": "layout",
	"icon-padding": "layout",
	"icon-pitch-alignment": "layout",
	"icon-rotate": "layout",
	"icon-rotation-alignment": "layout",
	"icon-size": "layout",
	"icon-text-fit": "layout",
	"icon-text-fit-padding": "layout",
	"symbol-avoid-edges": "layout",
	"symbol-placement": "layout",
	"symbol-sort-key": "layout",
	"symbol-spacing": "layout",
	"symbol-z-order": "layout",
	"text-allow-overlap": "layout",
	"text-anchor": "layout",
	"text-field": "layout",
	"text-font": "layout",
	"text-ignore-placement": "layout",
	"text-justify": "layout",
	"text-keep-upright": "layout",
	"text-letter-spacing": "layout",
	"text-line-height": "layout",
	"text-max-angle": "layout",
	"text-max-width": "layout",
	"text-offset": "layout",
	"text-optional": "layout",
	"text-padding": "layout",
	"text-pitch-alignment": "layout",
	"text-radial-offset": "layout",
	"text-rotate": "layout",
	"text-rotation-alignment": "layout",
	"text-size": "layout",
	"text-transform": "layout",
	"text-variable-anchor": "layout",
	"text-writing-mode": "layout",
	"circle-sort-key": "layout",
	// shortcuts
	"color": "shortcut", // depends
	"size": "shortcut", // depends
	"opacity": "shortcut", // depends
	"text": "shortcut", // text-field
	"font": "shortcut", // text-font
	"icon": "shortcut", // icon-image
};

exports = module.exports = function decorate(layers, style){

	// then un-camel the properties
	const rules = Object.entries(style).reduce(function(style,[id,rule]){

		// split off pseudo class
		let matchid = id.split(":");
		let pseudo = matchid[1]||"";
		matchid = matchid[0];

		style[id] = { paint: {}, layout: {}, root: {}, shortcut: {}, pseudo: pseudo, matchid: matchid };

		Object.entries(rule).forEach(function([k,v]){

			// turn objects into stops
			if (typeof v === "object" && !Array.isArray(v)) {
				v = Object.entries(v).reduce(function(stops,[z,v]){
					stops.stops.push([ parseInt(z,10), v ]);
					return stops;
				}, { stops: [] });
				v.stops = v.stops.sort(function(a,b){
					return a[0]-b[0];
				});
			};

			k = k.replace(/[A-Z]/g, function(l){ return "-"+l.toLowerCase() });
			if (props.hasOwnProperty(k)) {
				style[id][props[k]][k]=v;
			} else {
				style[id].root[k]=v;
			}
		});

		return style;
	},{});

	return Object.entries(structuredClone(layers)).map(function([id, layer]){

		// split off pseudo class
		let matchid = id.split(":");
		let pseudo = matchid[1]||"";
		matchid = matchid[0];

		// find rules for layer and apply
		Object.values(rules).filter(function(rule){
			const m = (glob(matchid, rule.matchid) && pseudo === rule.pseudo);
			// if (m) { console.log(matchid, rule.matchid); }
			return m;
		}).forEach(function(rule){
			rule = structuredClone(rule);

			// resolve shortcuts
			if (rule.shortcut) {
				if (rule.shortcut.text) rule.layout["text-field"] = rule.shortcut.text;
				if (rule.shortcut.font) rule.layout["text-font"] = rule.shortcut.text;
				if (rule.shortcut.color || rule.shortcut.size || rule.shortcut.opacity || rule.shortcut.icon) {
					switch (layer.type) {
						case "background":
							if (rule.shortcut.color) rule.paint["background-color"] = rule.shortcut.color;
							if (rule.shortcut.icon) rule.paint["background-pattern"] = rule.shortcut.icon;
							if (rule.shortcut.opacity) rule.paint["background-opacity"] = rule.shortcut.opacity;
						break;
						case "fill":
							if (rule.shortcut.color) rule.paint["fill-color"] = rule.shortcut.color;
							if (rule.shortcut.icon) rule.paint["fill-pattern"] = rule.shortcut.icon;
							if (rule.shortcut.opacity) rule.paint["fill-opacity"] = rule.shortcut.opacity;
						break;
						case "line":
							if (rule.shortcut.color) rule.paint["line-color"] = rule.shortcut.color;
							if (rule.shortcut.size) rule.paint["line-width"] = rule.shortcut.size;
							if (rule.shortcut.icon) rule.paint["line-pattern"] = rule.shortcut.icon;
							if (rule.shortcut.opacity) rule.paint["line-opacity"] = rule.shortcut.opacity;
						break;
						case "symbol":
							if (rule.shortcut.color) rule.paint["text-color"] = rule.shortcut.color;
							if (rule.shortcut.size) rule.paint["text-size"] = rule.shortcut.size;
							if (rule.shortcut.icon) rule.paint["icon-image"] = rule.shortcut.icon;
							if (rule.shortcut.opacity) rule.paint["text-opacity"] = rule.paint["icon-opacity"] = rule.shortcut.opacity;
						break;
					};
				};
				delete rule.shortcut;
			};

			// apply rule
			if (rule.paint) layer.paint = (layer.paint) ? { ...layer.paint, ...rule.paint } : rule.paint;
			if (rule.layout) layer.layout = (layer.layout) ? { ...layer.layout, ...rule.layout } : rule.layout;
			if (rule.root) layer = { ...layer, ...rule.root };

			// mark as touched
			layer.touched = true;

		});

		// layer → source-layer
		layer["source-layer"] = layer.layer;
		delete layer.layer;

		layer.source = "versatiles-shortbread";

		// return layer
		return { id, ...layer };
	}).filter(function(layer){
		return layer.touched;
	}).map(function(layer){
		delete layer.touched;
		if (layer.paint && Object.keys(layer.paint).length === 0) delete layer.paint;
		if (layer.layout && Object.keys(layer.layout).length === 0) delete layer.layout;
		return layer;
	});

	// FIXME aggregate

};
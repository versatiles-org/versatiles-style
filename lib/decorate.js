// decorates layers

const glob = require("minimatch");
const format = require("util").format;

const props = {
	// paint
	"background-color": ["paint", ["background"] ],
	"background-opacity": ["paint", ["background"] ],
	"background-pattern": ["paint", ["background"] ],
	"fill-antialias": ["paint", ["fill"] ],
	"fill-color": ["paint", ["fill"] ],
	"fill-opacity": ["paint", ["fill"] ],
	"fill-outline-color": ["paint", ["fill"] ],
	"fill-pattern": ["paint", ["fill"] ],
	"fill-translate": ["paint", ["fill"] ],
	"fill-translate-anchor": ["paint", ["fill"] ],
	"line-blur": ["paint", ["line"] ],
	"line-color": ["paint", ["line"] ],
	"line-dasharray": ["paint", ["line"] ],
	"line-gap-width": ["paint", ["line"] ],
	"line-gradient": ["paint", ["line"] ],
	"line-offset": ["paint", ["line"] ],
	"line-opacity": ["paint", ["line"] ],
	"line-pattern": ["paint", ["line"] ],
	"line-translate": ["paint", ["line"] ],
	"line-translate-anchor": ["paint", ["line"] ],
	"line-trim-offset": ["paint", ["line"] ],
	"line-width": ["paint", ["line"] ],
	"icon-color": ["paint", ["symbol"] ],
	"icon-halo-blur": ["paint", ["symbol"] ],
	"icon-halo-color": ["paint", ["symbol"] ],
	"icon-halo-width": ["paint", ["symbol"] ],
	"icon-opacity": ["paint", ["symbol"] ],
	"icon-translate": ["paint", ["symbol"] ],
	"icon-translate-anchor": ["paint", ["symbol"] ],
	"text-color": ["paint", ["symbol"] ],
	"text-halo-blur": ["paint", ["symbol"] ],
	"text-halo-color": ["paint", ["symbol"] ],
	"text-halo-width": ["paint", ["symbol"] ],
	"text-opacity": ["paint", ["symbol"] ],
	"text-translate": ["paint", ["symbol"] ],
	"text-translate-anchor": ["paint", ["symbol"] ],
	"raster-brightness-max": ["paint", ["raster"] ],
	"raster-brightness-min": ["paint", ["raster"] ],
	"raster-contrast": ["paint", ["raster"] ],
	"raster-fade-duration": ["paint", ["raster"] ],
	"raster-hue-rotate": ["paint", ["raster"] ],
	"raster-opacity": ["paint", ["raster"] ],
	"raster-resampling": ["paint", ["raster"] ],
	"raster-saturation": ["paint", ["raster"] ],
	"circle-blur": ["paint", ["circle"] ],
	"circle-color": ["paint", ["circle"] ],
	"circle-opacity": ["paint", ["circle"] ],
	"circle-pitch-alignment": ["paint", ["circle"] ],
	"circle-pitch-scale": ["paint", ["circle"] ],
	"circle-radius": ["paint", ["circle"] ],
	"circle-stroke-color": ["paint", ["circle"] ],
	"circle-stroke-opacity": ["paint", ["circle"] ],
	"circle-stroke-width": ["paint", ["circle"] ],
	"circle-translate": ["paint", ["circle"] ],
	"circle-translate-anchor": ["paint", ["circle"] ],
	"fill-extrusion-base": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-color": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-height": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-opacity": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-pattern": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-translate": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-translate-anchor": ["paint", ["fill-extrusion"] ],
	"fill-extrusion-vertical-gradient": ["paint", ["fill-extrusion"] ],
	"heatmap-color": ["paint", ["heatmap"] ],
	"heatmap-intensity": ["paint", ["heatmap"] ],
	"heatmap-opacity": ["paint", ["heatmap"] ],
	"heatmap-radius": ["paint", ["heatmap"] ],
	"heatmap-weight": ["paint", ["heatmap"] ],
	"hillshade-accent-color": ["paint", ["hillshade"] ],
	"hillshade-exaggeration": ["paint", ["hillshade"] ],
	"hillshade-highlight-color": ["paint", ["hillshade"] ],
	"hillshade-illumination-anchor": ["paint", ["hillshade"] ],
	"hillshade-illumination-direction": ["paint", ["hillshade"] ],
	"hillshade-shadow-color": ["paint", ["hillshade"] ],
	"sky-atmosphere-color": ["paint", ["sky"] ],
	"sky-atmosphere-halo-color": ["paint", ["sky"] ],
	"sky-atmosphere-sun": ["paint", ["sky"] ],
	"sky-atmosphere-sun-intensity": ["paint", ["sky"] ],
	"sky-gradient": ["paint", ["sky"] ],
	"sky-gradient-center": ["paint", ["sky"] ],
	"sky-gradient-radius": ["paint", ["sky"] ],
	"sky-opacity": ["paint", ["sky"] ],
	"sky-type": ["paint", ["sky"] ],
	// layout [""]
	"visibility": ["layout", ["background","fill","line","symbol","raster","circle","fill-extrusion","heatmap","hillshade","sky"] ],
	"fill-sort-key": ["layout", ["fill"] ],
	"line-cap": ["layout", ["line"] ],
	"line-join": ["layout", ["line"] ],
	"line-miter-limit": ["layout", ["line"] ],
	"line-round-limit": ["layout", ["line"] ],
	"line-sort-key": ["layout", ["line"] ],
	"icon-allow-overlap": ["layout", ["symbol"] ],
	"icon-anchor": ["layout", ["symbol"] ],
	"icon-ignore-placement": ["layout", ["symbol"] ],
	"icon-image": ["layout", ["symbol"] ],
	"icon-keep-upright": ["layout", ["symbol"] ],
	"icon-offset": ["layout", ["symbol"] ],
	"icon-optional": ["layout", ["symbol"] ],
	"icon-padding": ["layout", ["symbol"] ],
	"icon-pitch-alignment": ["layout", ["symbol"] ],
	"icon-rotate": ["layout", ["symbol"] ],
	"icon-rotation-alignment": ["layout", ["symbol"] ],
	"icon-size": ["layout", ["symbol"] ],
	"icon-text-fit": ["layout", ["symbol"] ],
	"icon-text-fit-padding": ["layout", ["symbol"] ],
	"symbol-avoid-edges": ["layout", ["symbol"] ],
	"symbol-placement": ["layout", ["symbol"] ],
	"symbol-sort-key": ["layout", ["symbol"] ],
	"symbol-spacing": ["layout", ["symbol"] ],
	"symbol-z-order": ["layout", ["symbol"] ],
	"text-allow-overlap": ["layout", ["symbol"] ],
	"text-anchor": ["layout", ["symbol"] ],
	"text-field": ["layout", ["symbol"] ],
	"text-font": ["layout", ["symbol"] ],
	"text-ignore-placement": ["layout", ["symbol"] ],
	"text-justify": ["layout", ["symbol"] ],
	"text-keep-upright": ["layout", ["symbol"] ],
	"text-letter-spacing": ["layout", ["symbol"] ],
	"text-line-height": ["layout", ["symbol"] ],
	"text-max-angle": ["layout", ["symbol"] ],
	"text-max-width": ["layout", ["symbol"] ],
	"text-offset": ["layout", ["symbol"] ],
	"text-optional": ["layout", ["symbol"] ],
	"text-padding": ["layout", ["symbol"] ],
	"text-pitch-alignment": ["layout", ["symbol"] ],
	"text-radial-offset": ["layout", ["symbol"] ],
	"text-rotate": ["layout", ["symbol"] ],
	"text-rotation-alignment": ["layout", ["symbol"] ],
	"text-size": ["layout", ["symbol"] ],
	"text-transform": ["layout", ["symbol"] ],
	"text-variable-anchor": ["layout", ["symbol"] ],
	"text-writing-mode": ["layout", ["symbol"] ],
	"circle-sort-key": ["layout", ["cirlce"] ],
	// shortcuts
	"color": ["shortcut"], // depends
	"size": ["shortcut"], // depends
	"opacity": ["shortcut"], // depends
	"text": ["shortcut"], // text-field
	"font": ["shortcut"], // text-font
	"icon": ["shortcut"], // icon-image
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

			// noone accepts hexa :(
			if (typeof v === "string" && /^#[0-9a-fA-F]{8}$/.test(v)) v = v.replace(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/, function(_,r,g,b,a){
				return format('rgba(%s, %s, %s, %s)', parseInt(r,16), parseInt(g,16), parseInt(b,16), parseInt(a,16)/255)
			});

			k = k.replace(/[A-Z]/g, function(l){ return "-"+l.toLowerCase() });

			if (props.hasOwnProperty(k)) {
				style[id][props[k][0]][k]=v;
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
						if (rule.shortcut.size) rule.layout["text-size"] = rule.shortcut.size;
						if (rule.shortcut.text) rule.layout["text-field"] = rule.shortcut.text;
						if (rule.shortcut.font) rule.layout["text-font"] = (Array.isArray(rule.shortcut.font)) ? rule.shortcut.font : [ rule.shortcut.font ];
						if (rule.shortcut.icon) rule.paint["icon-image"] = rule.shortcut.icon;
						if (rule.shortcut.opacity) rule.paint["text-opacity"] = rule.paint["icon-opacity"] = rule.shortcut.opacity;
					break;
				};
				delete rule.shortcut;
			};

			// apply rule
			if (rule.paint) layer.paint = (layer.paint) ? { ...layer.paint, ...rule.paint } : rule.paint;
			if (rule.layout) layer.layout = (layer.layout) ? { ...layer.layout, ...rule.layout } : rule.layout;
			if (rule.root) layer = { ...layer, ...rule.root };

			// remove inapplicable rules, becaue renderer freaks out at them
			Object.keys(layer.paint).forEach(function(k){ if (!props[k][1].includes(layer.type)) delete layer.paint[k]; });
			Object.keys(layer.layout).forEach(function(k){ if (!props[k][1].includes(layer.type)) delete layer.layout[k]; });

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
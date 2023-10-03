#!/usr/bin/env node

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import stringify from "json-stringify-pretty-compact";
import layers from "../lib/layers.js";
import decorate from "../lib/decorate.js";
import template from "../lib/template.js";

const dirRoot = new URL('../', import.meta.url).pathname;
const dirSrc = resolve(dirRoot, "styles");
const dirDst = resolve(dirRoot, "dist");

// get args --tilejson --glyphs --fonts TODO

// ensure dest dir exists
mkdirSync(dirDst, { recursive: true });

// load styles
const styles = {};
for (let file of readdirSync(dirSrc)) {
	if (!file.endsWith(".js")) continue;

	const { default: styledef } = await import(resolve(dirSrc, file));
	const styleid = file.slice(0, -3);

	// FIXME prettier

	// apply style
	const style = {
		...template,
		id: "versatiles-" + styleid,
		name: "versatiles-" + styleid,
		layers: decorate(layers, styledef),
	}

	// write
	writeFileSync(resolve(dirDst, styleid + ".json"), stringify(style, { indent: "\t", maxLength: 80 }));
	console.log("Saved '%s'", styleid);

	// make no label version
	writeFileSync(resolve(dirDst, styleid + ".nolabel.json"), stringify({
		...style,
		id: style.id + "-nolabel",
		name: style.name + "-nolabel",
		layers: style.layers.filter(layer =>
			!layer.id.startsWith("label-") &&
			!layer.id.startsWith("poi-") &&
			!layer.id.startsWith("symbol-")
		),
	}, { indent: "\t", maxLength: 80 }));

	console.log("Saved '%s' (No Labels)", styleid);
};

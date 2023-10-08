#!/usr/bin/env node
'use strict'

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as StylemakerClasses from '../index.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const dirRoot = new URL('../', import.meta.url).pathname;
const dirDst = resolve(dirRoot, 'dist');

// get args --tilejson --glyphs --fonts TODO

// ensure destination dir exists
if (existsSync(dirDst)) rmSync(dirDst, { recursive: true });
mkdirSync(dirDst, { recursive: true });

// load styles
for (let StylemakerClass of Object.values(StylemakerClasses)) {
	let styleGenerator = new StylemakerClass();
	const styleId = styleGenerator.id;
	const options = styleGenerator.getOptions();
	const style = styleGenerator.build();

	// Validate the style and log errors if any	
	let errors = validateStyleMin(style);
	if (errors.length > 0) console.log(errors);

	process.exit();

	// FIXME prettier


	// write
	writeFileSync(resolve(dirDst, styleid + ".json"), stringify(style, { indent: "\t", maxLength: 80 }));
	console.log("Saved '%s'", styleid);

	style.set()
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

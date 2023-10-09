#!/usr/bin/env node
'use strict'

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import StyleBakerClasses from '../src/index.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const dirRoot = new URL('../', import.meta.url).pathname;
const dirDst = resolve(dirRoot, 'dist');

// get args --tilejson --glyphs --fonts TODO

// ensure destination dir exists
if (existsSync(dirDst)) rmSync(dirDst, { recursive: true });
mkdirSync(dirDst, { recursive: true });

// load styles
for (let StyleBakerClass of Object.values(StyleBakerClasses)) {
	let styleBaker = new StyleBakerClass();
	const styleId = styleBaker.id;
	const options = styleBaker.getOptions();

	produce(styleId, options);

	options.hideLabels = true;
	produce(styleId + '.nolabel', options);

	function produce(name, options) {
		const style = styleBaker.bake(options);
		// Validate the style and log errors if any	
		let errors = validateStyleMin(style);
		if (errors.length > 0) console.log(errors);
		// write
		writeFileSync(resolve(dirDst, name + '.json'), JSON.stringify(style));
		console.log('Saved ' + name);
	}
};

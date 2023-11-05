'use strict';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as StyleMakers from '../src/index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prettyStyleJSON } from '../src/lib/utils.js';
import type { MaplibreStyle } from '../src/lib/types.js';



const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });



// load styles
for (const styleMaker of Object.values(StyleMakers)) {
	const { name } = styleMaker;
	const options = styleMaker.defaultOptions;

	options.languageSuffix = '';
	produce(name, styleMaker.build(options));

	options.languageSuffix = '_en';
	produce(name + '.en', styleMaker.build(options));

	options.languageSuffix = '_de';
	produce(name + '.de', styleMaker.build(options));

	options.hideLabels = true;
	produce(name + '.nolabel', styleMaker.build(options));
}

function produce(name: string, style: MaplibreStyle): void {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style as StyleSpecification);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}

'use strict';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Colorful, Graybeard, Neutrino } from '../src/index.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prettyStyleJSON } from './lib/utils.js';
import type { MaplibreStyle } from '../src/index.js';
import StyleBuilder from '../src/lib/style_builder.ts';



const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });



// load styles
[
	Colorful,
	Graybeard,
	Neutrino,
].forEach(styleBuilderClass => {
	const styleBuilder = new styleBuilderClass();
	const { name } = styleBuilder;

	styleBuilder.languageSuffix = '';
	produce(name, styleBuilder.build());

	styleBuilder.languageSuffix = '_en';
	produce(name + '.en', styleBuilder.build());

	styleBuilder.languageSuffix = '_de';
	produce(name + '.de', styleBuilder.build());

	styleBuilder.hideLabels = true;
	produce(name + '.nolabel', styleBuilder.build());
})

function produce(name: string, style: MaplibreStyle): void {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}

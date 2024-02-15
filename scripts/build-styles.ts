'use strict';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { styles } from '../src/index.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prettyStyleJSON } from './lib/utils.js';
import type { MaplibreStyle } from '../src/lib/types.js';



const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });



// load styles
Object.entries(styles).forEach(([name, build]) => {
	produce(name, build({ languageSuffix: '' }));
	produce(name + '.en', build({ languageSuffix: '_en' }));
	produce(name + '.de', build({ languageSuffix: '_de' }));
	produce(name + '.nolabel', build({ hideLabels: true }));
})

function produce(name: string, style: MaplibreStyle): void {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}

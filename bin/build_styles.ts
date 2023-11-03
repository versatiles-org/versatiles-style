#!/usr/bin/env node
'use strict'

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as StyleBakerClasses from '../src/index.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prettyStyleJSON } from '../src/lib/utils.js';
import { MaplibreStyle } from '../src/lib/types.js';

const dirRoot = new URL('../', import.meta.url).pathname;
const dirDst = resolve(dirRoot, 'dist');

let baseUrl = process.argv[2];
if (baseUrl) {
	baseUrl = baseUrl.trim().replace(/\/+$/, '');
	if (!/https?:\/\/[-a-zA-Z0-9@:%._+~#=]+/.test(baseUrl)) {
		console.error(`base URL is malformed: "${baseUrl}"`);
		process.exit();
	}
}

// ensure destination dir exists
if (existsSync(dirDst)) rmSync(dirDst, { recursive: true });
mkdirSync(dirDst, { recursive: true });

// load styles
for (const getStyle of Object.values(StyleBakerClasses)) {
	const name = getStyle.name;
	const options = getStyle.options;

	options.language = '';
	produce(name, getStyle(options));

	options.language = 'en';
	produce(name + '.en', getStyle(options));

	options.language = 'de';
	produce(name + '.de', getStyle(options));

	options.hideLabels = true;
	produce(name + '.nolabel', getStyle(options));
}

function produce(name: string, style: MaplibreStyle) {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style as StyleSpecification);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}

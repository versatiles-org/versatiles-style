#!/usr/bin/env npx tsx
'use strict'

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as StyleMakers from '../src/index.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prettyStyleJSON } from '../src/lib/utils.js';
import { MaplibreStyle } from '../src/lib/types.js';

const dirRoot = new URL('../', import.meta.url).pathname;
const dirDst = resolve(dirRoot, 'release');

let baseUrl = process.argv[2];
if (baseUrl) {
	baseUrl = baseUrl.trim().replace(/\/+$/, '');
	if (!/https?:\/\/[-a-zA-Z0-9@:%._+~#=]+/.test(baseUrl)) {
		console.error(`base URL is malformed: "${baseUrl}"`);
		process.exit();
	}
}

// ensure destination dir exists
mkdirSync(dirDst, { recursive: true });

// load styles
for (const styleMaker of Object.values(StyleMakers)) {
	const name = styleMaker.name;
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

function produce(name: string, style: MaplibreStyle) {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style as StyleSpecification);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}

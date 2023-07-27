#!/usr/bin/env node

import fs, { readFileSync } from "node:fs";
import path from "node:path";
import stringify from "json-stringify-pretty-compact";
import layers from "../lib/layers.js";
import decorate from "../lib/decorate.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const template = readFileSync(path.resolve(__dirname, "../lib/template.json"));
const srcdir = path.resolve(__dirname, "../styles");
const destdir = path.resolve(__dirname, "../dist");

// get args --tilejson --glyphs --fonts TODO

// ensure dest dir exists
fs.mkdir(destdir, { recursive: true }, function (err) {
	if (err) throw err;
	// load styles
	const styles = {};
	fs.readdir(srcdir, function (err, files) {
		files.filter(function (file) {
			return (file.slice(-3) === ".js");
		}).forEach(function (file) {
			const styledef = require(path.resolve(srcdir, file));
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
			fs.writeFile(path.resolve(destdir, styleid + ".json"), stringify(style, { indent: "\t", maxLength: 80 }), function (err) {
				if (err) throw err;
				console.log("Saved '%s'", styleid);

				// make no label version
				fs.writeFile(path.resolve(destdir, styleid + ".nolabel.json"), stringify({
					...style,
					id: style.id + "-nolabel",
					name: style.name + "-nolabel",
					layers: style.layers.filter(function (layer) {
						return (layer.id.slice(0, 6) !== "label-" && layer.id.slice(0, 4) !== "poi-" && layer.id.slice(0, 7) !== "symbol-");
					}),
				}, { indent: "\t", maxLength: 80 }), function (err) {
					if (err) throw err;
					console.log("Saved '%s' (No Labels)", styleid);

				});

			});

		});

	});
});

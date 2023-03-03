#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const stringify = require("json-stringify-pretty-compact");

const layers = require("../lib/layers");
const decorate = require("../lib/decorate");
const template = require("../lib/template.json");

const srcdir = path.resolve(__dirname,"../styles");
const destdir = path.resolve(__dirname,"../dist");

// get args --tilejson --glyphs --fonts TODO

// ensure dest dir exists
fs.mkdir(destdir, { recursive: true }, function(err){
	if (err) throw err;
	// load styles
	const styles = {};
	fs.readdir(srcdir, function(err, files){
		files.filter(function(file){
			return (file.slice(-3) === ".js");
		}).forEach(function(file){
			const styledef = require(path.resolve(srcdir,file));
			const styleid = file.slice(0,-3);

			// FIXME prettier

			// apply style
			const style = stringify({
				...template,
				id: "versatiles-"+styleid,
				name: "versatiles-"+styleid,
				layers: decorate(layers, styledef),
			},{ indent: "\t", maxLength: 80 });

			// write
			fs.writeFile(path.resolve(destdir, styleid+".json"), style, function(err){
				if (err) throw err;
				console.log("Saved '%s'", styleid);
			});

		});

	});
});

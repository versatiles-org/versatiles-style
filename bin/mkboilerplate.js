import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import stringify from "json-stringify-pretty-compact";

const __dirname = dirname(fileURLToPath(import.meta.url));
const destdir = resolve(__dirname, "../dist");
const styleid = "empty";

import template from "../lib/template.js";
import layers from "../lib/layers.js";

const style = stringify({
	...template,
	layers: Object.entries(layers).reduce(function (layers, [id, layer]) {

		// id

		// layer → source-layer
		layer["source-layer"] = layer.layer;
		delete layer.layer;
		delete layer.icon;

		if (layer.type !== "background") layer.source = "versatiles-shortbread";

		layers.push({ id, ...layer });

		return layers;
	}, []),
	id: "shortbread-empty",
	name: "versatiles-empty",
}, { indent: "\t", maxLength: 80 });

writeFileSync(resolve(destdir, styleid + ".json"), style)
console.log("Saved '%s'", styleid);

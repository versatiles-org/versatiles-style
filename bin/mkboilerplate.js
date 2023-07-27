const fs = require("fs");
const path = require("path");

const stringify = require("json-stringify-pretty-compact");

const destdir = path.resolve(__dirname, "../dist");
const styleid = "empty";

const style = stringify({
	...require("../lib/template"),
	layers: Object.entries(require("../lib/layers")).reduce(function (layers, [id, layer]) {

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

fs.writeFile(path.resolve(destdir, styleid + ".json"), style, function (err) {
	if (err) throw err;
	console.log("Saved '%s'", styleid);
});

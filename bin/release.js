const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const tar = require("tar-stream");

const dirRoot = new URL('../', import.meta.url).pathname;
const dirSrc = path.resolve(dirRoot, "dist");
const dest = path.resolve(dirRoot, "dist/versatiles-styles.tar.gz");

fs.readdir(dirSrc, async function (err, files) {
	if (err) return console.error("Could not read dir '%s': %s", dirSrc, err);

	const pack = new tar.pack();

	pack.pipe(zlib.createGzip()).pipe(fs.createWriteStream(dest).on("close", function () {
		console.log("Done.");
	}));

	const queue = files.filter(function (file) {
		return (file.slice(-5) === ".json");
	}).map(function (file) {
		return function (resolve, reject) {

			const filepath = path.join(dirSrc, file);

			fs.stat(filepath, function (err, stats) {
				if (err) return reject(err);

				const entry = pack.entry({ name: path.join("sprites", file), size: stats.size }, function (err) {
					console.log("packed %s", file);
					if (err) return reject(err);
					resolve();
				});

				fs.createReadStream(filepath).pipe(entry);

			});

		};

	});

	for (const fn of queue) await new Promise(fn);

	pack.finalize();

});

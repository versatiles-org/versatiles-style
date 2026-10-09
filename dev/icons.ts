/**
 * Icon editor: adjust where an icon's ink sits on its canvas, and see the result before saving.
 *
 *     npm run dev   →   http://localhost:8080/icons.html
 *
 * An icon is anchored on the map at the centre of its canvas, so "position" is the ink's place on
 * that canvas. This page shifts it through the `viewBox` origin (see dev/icon-editor.ts), measures
 * it the way `npm run icons-report` does — ink bounding box against canvas centre — and shows the
 * icon large with both centres drawn in, and at map sizes on a light and a dark ground.
 *
 * Saving rewrites the SVG under `icons/`. The sprite sheets are not rebuilt: run
 * `npm run build-sprites` to see the icon on the map.
 */

interface Icon {
	src: string;
	svg: string;
	/** Width and height of the viewBox. */
	w: number;
	h: number;
	/** The ink's shift as the file has it, in viewBox units — the negated viewBox origin. */
	saved: [number, number];
	/** The shift being previewed. */
	shift: [number, number];
}

interface Ink {
	/** Offset of the ink's bounding-box centre from the canvas centre, as a fraction of the canvas. */
	dx: number;
	dy: number;
	/** The bounding box, as fractions of the canvas. */
	box: [number, number, number, number];
}

// The same threshold as CENTRING_TOLERANCE in scripts/icons-report.ts.
const TOLERANCE = 0.05;
const SIZES = [16, 22, 32, 48];
const VIEWBOX = /(<svg[^>]*\sviewBox=")\s*([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)\s*(")/;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const round = (v: number): number => Math.round(v * 1e4) / 1e4 || 0;
const percent = (v: number): string => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

/** The SVG with the previewed shift as its viewBox origin, at an explicit pixel size. */
function shifted(icon: Icon, width: number, height: number): string {
	const [x, y] = icon.shift;
	return (
		icon.svg
			.replace(VIEWBOX, (_, before: string, _x, _y, w: string, h: string, after: string) => {
				return `${before}${round(-x)} ${round(-y)} ${w} ${h}${after}`;
			})
			// twice: both attributes sit in the same tag, and one pass can only take one of them out
			.replace(/(<svg[^>]*?)\s(?:width|height)="[^"]*"/g, '$1')
			.replace(/(<svg[^>]*?)\s(?:width|height)="[^"]*"/g, '$1')
			.replace(/<svg\b/, `<svg width="${width}" height="${height}"`)
	);
}

const dataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Rasterizes the icon and finds its ink, like the centring check of the icons report. */
async function measure(icon: Icon, height = 128): Promise<Ink | undefined> {
	const width = Math.round((height * icon.w) / icon.h);
	const image = new Image();
	image.src = dataUrl(shifted(icon, width, height));
	await image.decode();

	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d')!;
	context.drawImage(image, 0, 0, width, height);
	const { data } = context.getImageData(0, 0, width, height);

	let x0 = width,
		y0 = height,
		x1 = -1,
		y1 = -1;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (data[(y * width + x) * 4 + 3] > 8) {
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
			}
		}
	}
	if (x1 < 0) return undefined; // no ink at all

	const box: Ink['box'] = [x0 / width, y0 / height, (x1 + 1) / width, (y1 + 1) / height];
	return { dx: (box[0] + box[2]) / 2 - 0.5, dy: (box[1] + box[3]) / 2 - 0.5, box };
}

const isOff = (ink?: Ink): boolean => !!ink && (Math.abs(ink.dx) > TOLERANCE || Math.abs(ink.dy) > TOLERANCE);

// ---- state ------------------------------------------------------------------

const icons = new Map<string, Icon>();
const offCentre = new Map<string, Ink>();
let current: Icon | undefined;
let currentInk: Ink | undefined;

function parse(src: string, svg: string): Icon | undefined {
	const m = VIEWBOX.exec(svg);
	if (!m) return undefined;
	const saved: [number, number] = [round(-parseFloat(m[2])), round(-parseFloat(m[3]))];
	return { src, svg, w: parseFloat(m[4]), h: parseFloat(m[5]), saved, shift: [...saved] };
}

async function load(): Promise<void> {
	const list = (await (await fetch('/icon-api/icons')).json()) as { src: string; svg: string }[];
	for (const { src, svg } of list) {
		const icon = parse(src, svg);
		// keep a shift that is being previewed across a reload of the list
		const previous = icons.get(src);
		if (icon && previous) icon.shift = previous.shift;
		if (icon) icons.set(src, icon);
	}
	renderList();
	select(icons.get(decodeURIComponent(location.hash.slice(1))) ?? current ?? icons.values().next().value);

	// The off-centre marks of the list, measured as the files are — not as they are previewed.
	for (const icon of icons.values()) {
		const ink = await measure({ ...icon, shift: icon.saved }, 64);
		if (isOff(ink)) offCentre.set(icon.src, ink!);
		else offCentre.delete(icon.src);
	}
	renderList();
}

// ---- list -------------------------------------------------------------------

function renderList(): void {
	const filter = $<HTMLInputElement>('filter').value.toLowerCase();
	const offOnly = $<HTMLInputElement>('offOnly').checked;
	const list = $('list');
	list.replaceChildren();
	for (const icon of icons.values()) {
		const ink = offCentre.get(icon.src);
		if (!icon.src.includes(filter) || (offOnly && !ink)) continue;
		const button = document.createElement('button');
		button.textContent = icon.src;
		button.className = icon === current ? 'selected' : '';
		if (ink) {
			const note = document.createElement('small');
			note.textContent = `${percent(ink.dx)} ${percent(ink.dy)}`;
			button.append(note);
		}
		button.onclick = () => select(icon);
		list.append(button);
	}
}

function select(icon?: Icon): void {
	if (!icon) return;
	current = icon;
	history.replaceState(null, '', `#${icon.src}`);
	$('status').textContent = '';
	renderList();
	void render();
}

// ---- preview ----------------------------------------------------------------

async function render(): Promise<void> {
	const icon = current;
	if (!icon) return;
	const ink = await measure(icon, 256);
	if (icon !== current) return; // another icon was selected meanwhile
	currentInk = ink;

	const [x, y] = icon.shift;
	const changed = x !== icon.saved[0] || y !== icon.saved[1];
	$('title').textContent = `${icon.src}${changed ? ' *' : ''}`;

	const stage = $('stage');
	const height = stage.clientHeight;
	const width = Math.round((height * icon.w) / icon.h);
	stage.style.width = `${width}px`;
	$<HTMLImageElement>('large').src = dataUrl(shifted(icon, width, height));

	// Red: the canvas centre, which is what lands on the coordinate. Blue: the ink's box and centre.
	const box = ink?.box.map((v, i) => v * (i % 2 ? height : width));
	$('overlay').outerHTML = `<svg id="overlay" viewBox="0 0 ${width} ${height}" fill="none">
		<path d="M${width / 2} 0V${height}M0 ${height / 2}H${width}" stroke="#e5484d" />
		${
			box
				? `<rect x="${box[0]}" y="${box[1]}" width="${box[2] - box[0]}" height="${box[3] - box[1]}" stroke="#3a7bd5" stroke-dasharray="4 3" />
		<path d="M${(box[0] + box[2]) / 2 - 8} ${(box[1] + box[3]) / 2}h16m-8 -8v16" stroke="#3a7bd5" stroke-width="2" />`
				: ''
		}
	</svg>`;

	$('sizes').replaceChildren(
		...['', 'dark'].map((ground) => {
			const swatch = document.createElement('div');
			swatch.className = `swatch ${ground}`;
			for (const size of SIZES) {
				const w = Math.round((size * icon.w) / icon.h);
				const frame = document.createElement('span');
				frame.className = 'icon';
				frame.style.height = `${size}px`;
				frame.title = `${size}px`;
				const image = new Image(w, size);
				// rasterized at twice the size, as the @2x sheet is
				image.src = dataUrl(shifted(icon, w * 2, size * 2));
				frame.append(image);
				swatch.append(frame);
			}
			return swatch;
		})
	);

	const cell = (value: number | undefined, unit: number): string =>
		value === undefined
			? '<td>–</td><td></td>'
			: `<td class="${Math.abs(value) > TOLERANCE ? 'off' : ''}">${percent(value)}</td><td>${round(value * unit)} units</td>`;
	$('numbers').innerHTML = `
		<tr><td></td><td colspan="2">x (right)</td><td colspan="2">y (down)</td></tr>
		<tr><td>ink centre − canvas centre</td>${cell(ink?.dx, icon.w)}${cell(ink?.dy, icon.h)}</tr>
		<tr><td>shift of the ink</td><td colspan="2">${x} units</td><td colspan="2">${y} units</td></tr>
		<tr><td>viewBox</td><td colspan="4"><code>${round(-x)} ${round(-y)} ${icon.w} ${icon.h}</code>${
			changed ? ` (saved: <code>${round(-icon.saved[0])} ${round(-icon.saved[1])} ${icon.w} ${icon.h}</code>)` : ''
		}</td></tr>`;
}

// ---- controls ---------------------------------------------------------------

function nudge(x: number, y: number): void {
	if (!current) return;
	const step = parseFloat($<HTMLSelectElement>('step').value);
	current.shift = [round(current.shift[0] + x * step), round(current.shift[1] + y * step)];
	void render();
}

$('left').onclick = () => nudge(-1, 0);
$('right').onclick = () => nudge(1, 0);
$('up').onclick = () => nudge(0, -1);
$('down').onclick = () => nudge(0, 1);

document.addEventListener('keydown', (event) => {
	if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
	const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
	if (!move) return;
	event.preventDefault();
	nudge(move[0], move[1]);
});

// Puts the centre of the ink's bounding box on the canvas centre, to a hundredth of a unit.
$('centre').onclick = () => {
	if (!current || !currentInk) return;
	const to = (shift: number, offset: number, size: number): number =>
		Math.round((shift - offset * size) * 100) / 100 || 0;
	current.shift = [to(current.shift[0], currentInk.dx, current.w), to(current.shift[1], currentInk.dy, current.h)];
	void render();
};

$('reset').onclick = () => {
	if (!current) return;
	current.shift = [...current.saved];
	void render();
};

$('save').onclick = async () => {
	if (!current) return;
	const { src, shift } = current;
	const response = await fetch('/icon-api/shift', {
		method: 'POST',
		body: JSON.stringify({ src, x: shift[0], y: shift[1] }),
	});
	if (!response.ok) {
		$('status').textContent = `not saved: ${await response.text()}`;
		return;
	}
	await load();
	$('status').textContent = `saved icons/${src}.svg — run "npm run build-sprites" to see it on the map`;
};

$('filter').oninput = renderList;
$('offOnly').onchange = renderList;

void load();

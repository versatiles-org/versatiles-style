import color from 'color';
import template from './template.js';

export default class Stylemaker {
	#id
	#fonts
	#colors
	#templateJSON
	constructor(id) {
		if (!id) throw Error('every style should have an id');

		this.#id = id;
		this.#fonts = new Map();
		this.#colors = new Map();
		this.#layers = new Map();
		this.#templateJSON = JSON.stringify(template);
	}
	addFonts(obj) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.#fonts.has(key)) throw Error('duplicated font id: ' + key);
			this.#fonts.set(key, value);
		})
	}
	addColors(obj) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.#colors.has(key)) throw Error('duplicated color id: ' + key);
			this.#colors.set(key, value);
		})
	}
	addLayers(obj) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.#colors.has(key)) throw Error('duplicated color id: ' + key);
			this.#colors.set(key, value);
		})
	}
	getStyle() {
		const style = JSON.parse(this.#templateJSON);
		style.id = this.#id;
		style.name = this.#id;
		style.layers = decorate(layers, styledef);
	}
}

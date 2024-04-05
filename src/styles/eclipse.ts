import Colorful from './colorful.js';

export default class Eclipse extends Colorful {
	public readonly name: string = 'Eclipse';

	public constructor() {
		super();

		this.transformDefaultColors(color => {
			color = color.hsl();
			return color.lightness(100 - color.lightness()).rgb();
		});
	}
}

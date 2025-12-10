import Colorful from './colorful.js';

export default class Shadow extends Colorful {
	public readonly name: string = 'Shadow';

	public constructor() {
		super();

		this.transformDefaultColors((color) => color.saturate(-1).invert().brightness(0.2));
	}
}

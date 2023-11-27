import Colorful from './colorful.js';

export default class Graybeard extends Colorful {
	public readonly name: string = 'graybeard';

	public constructor() {
		super();

		this.transformDefaultColors(color => color.desaturate(1));
	}
}
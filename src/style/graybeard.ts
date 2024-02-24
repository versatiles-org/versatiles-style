import Colorful from './colorful';

export default class Graybeard extends Colorful {
	public readonly name: string = 'Graybeard';

	public constructor() {
		super();

		this.transformDefaultColors(color => color.desaturate(1));
	}
}
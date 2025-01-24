import Colorful from './colorful';

export default class Eclipse extends Colorful {
	public readonly name: string = 'Eclipse';

	public constructor() {
		super();

		this.transformDefaultColors(color => color.invertLuminosity());
	}
}

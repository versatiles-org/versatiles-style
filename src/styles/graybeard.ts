
import Colorful from './colorful.js';

export default class Graybeard extends Colorful {
	constructor() {
		super();

		this.name = 'graybeard';

		Object.values(this.colors).forEach(color => color.desaturate(1));
	}
}

import Colorful from './colorful.js';

export default class Graybeard extends Colorful {
	constructor() {
		super();

		this.name = 'graybeard';

		this.recolor(color => color.desaturate(1));
	}
}
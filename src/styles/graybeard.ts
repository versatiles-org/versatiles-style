/* eslint-disable @typescript-eslint/naming-convention */

import Colorful from './colorful.js';

export default class Graybeard extends Colorful {
	public constructor() {
		super();

		this.name = 'graybeard';

		this.recolor(color => color.desaturate(1));
	}
}
/* eslint-disable @typescript-eslint/naming-convention */

import Colorful from './colorful.js';

export default class Graybeard extends Colorful {
	public readonly name: string = 'graybeard';

	public constructor() {
		super();

		this.resetColors(color => color.desaturate(1));
	}
}
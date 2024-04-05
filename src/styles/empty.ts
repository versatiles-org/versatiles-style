/* eslint-disable @typescript-eslint/naming-convention */

import StyleBuilder from '../style_builder/style_builder.js';
import type { StyleRules, StyleRulesOptions } from '../style_builder/types.js';

export default class Empty extends StyleBuilder<Empty> {
	public readonly name: string = 'Empty';

	public defaultFonts = {
		regular: 'noto_sans_regular',
		bold: 'noto_sans_bold',
	};

	public defaultColors = {};

	protected getStyleRules(options: StyleRulesOptions<Empty>): StyleRules {
		return {};
	}
}
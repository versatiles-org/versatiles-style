import type { StyleRules, StyleRulesOptions } from '../style_builder/types';
import Colorful from './colorful';

export default class Empty extends StyleBuilder<Empty> {
	public readonly name: string = 'Empty';

	public defaultFonts = {
		regular: 'noto_sans_regular',
		bold: 'noto_sans_bold',
	};

	public defaultColors = {};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected getStyleRules(options: StyleRulesOptions<Empty>): StyleRules {
		return {};
	}
}
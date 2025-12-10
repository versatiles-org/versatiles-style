import type { StyleRules, StyleRulesOptions } from '../style_builder/types.js';
import Colorful from './colorful.js';

export default class Empty extends Colorful {
	public readonly name: string = 'Empty';

	protected getStyleRules(_options: StyleRulesOptions): StyleRules {
		return {};
	}
}

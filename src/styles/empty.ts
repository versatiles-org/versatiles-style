import type { StyleRules, StyleRulesOptions } from '../style_builder/types';
import Colorful from './colorful';

export default class Empty extends Colorful {
	public readonly name: string = 'Empty';

	protected getStyleRules(_options: StyleRulesOptions): StyleRules {
		return {};
	}
}
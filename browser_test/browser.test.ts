
import * as V from '../release/versatiles-style.js';

type Builder = typeof V.Colorful | typeof V.Neutrino;
type Style = V.Colorful | V.Neutrino;

interface StyleTestConfig {
	name: string;
	builder: Builder;
}

const styles: StyleTestConfig[] = [
	{ name: 'Colorful', builder: V.Colorful },
	{ name: 'Graybeard', builder: V.Graybeard },
	{ name: 'Neutrino', builder: V.Neutrino },
];

for (const style of styles) {
	test(style);
}


function test(config: StyleTestConfig): void {

	describe('Style: ' + config.name, () => {
		let style: Style;
		beforeEach(() => style = new config.builder());

		it('should be buildable', () => {
			expect(style.build()).toBeTruthy();
		});
	});

}
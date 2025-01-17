import { HSL } from "./hsl.ts";
import { HSV } from "./hsv.ts";

const scenarios: [number, number, number, number][] = [
	[-100, 14, 15, 0],
	[0, 0, 0, 0.1],
	[100, 0, 50, 0.2],
	[200, 0, 100, 0.3],
	[300, 50, 0, 0.4],
	[400, 50, 50, 0.5],
	[500, 50, 100, 0.6],
	[600, 100, 0, 0.7],
	[700, 100, 50, 0.8],
	[800, 100, 100, 0.9],
	[900, 12, 13, 1.0],
]

test('test hsv -> hsl -> rgb', () => {
	for (const v of scenarios) {
		const hsv = new HSV(...v);
		expect(hsv.a).toEqual(v[3]);
		const hsl = hsv.asHSL();
		const a1 = hsv.asRGB().asArray();
		const a2 = hsl.asRGB().asArray();
		for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
	}
});

test('test hsl -> hsv -> rgb', () => {
	for (const v of scenarios) {
		const hsl = new HSL(...v);
		expect(hsl.a).toEqual(v[3]);
		const hsv = hsl.asHSV();
		const a1 = hsv.asRGB().asArray();
		const a2 = hsl.asRGB().asArray();
		for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
	}
});

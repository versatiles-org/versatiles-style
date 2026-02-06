export function clamp(value: number, min: number, max: number): number {
	if (value == null || isNaN(value)) return min;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

export function mod(value: number, max: number): number {
	value = value % max;
	if (value < 0) value += max;
	if (value === 0) return 0;
	return value;
}

export function formatFloat(num: number, precision: number): string {
	return num.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
}

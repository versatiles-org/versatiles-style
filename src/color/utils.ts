

export function clamp(num: number, min: number, max: number): number {
	return Math.min(Math.max(min, num), max);
}

export function mod(num: number, max: number): number {
	return ((num % max) + max) % max;
}

export function formatFloat(num: number, precision: number): string {
	return num.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
}
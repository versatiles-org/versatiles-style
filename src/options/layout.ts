export type LayoutOptions = {
	scale?: number | { labels?: number; icons?: number };
	spacing?: number | { labels?: number; icons?: number };
};

export type ResolvedLayout = {
	labels: { scale: number; spacing: number };
	icons: { scale: number; spacing: number };
};

export function resolveLayout(layout?: LayoutOptions): ResolvedLayout {
	const scale = layout?.scale;
	const spacing = layout?.spacing;
	const labelScale = (typeof scale === 'number' ? scale : scale?.labels) ?? 1;
	const iconScale = (typeof scale === 'number' ? scale : scale?.icons) ?? 1;
	const labelSpacing = (typeof spacing === 'number' ? spacing : spacing?.labels) ?? 1;
	const iconSpacing = (typeof spacing === 'number' ? spacing : spacing?.icons) ?? 1;
	return {
		labels: { scale: labelScale, spacing: labelSpacing },
		icons: { scale: iconScale, spacing: iconSpacing },
	};
}

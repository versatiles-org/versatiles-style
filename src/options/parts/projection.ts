/**
 * Map projection.
 *
 * Web Mercator grossly exaggerates area away from the equator — Greenland reads as the size of
 * Africa — and that distortion is worst at exactly the low zooms where the whole world is visible.
 * `globe` is correct there, and MapLibre transitions back to Mercator as you zoom in, so the cost is
 * confined to the zooms where Mercator is wrong (issue #129).
 *
 * Requires MapLibre GL JS 5.0+. Renderers without projection support — MapLibre GL JS 4.x, and the
 * native/server renderers, which are Mercator-only — ignore the property and draw Mercator, which is
 * the pre-v6 behaviour. Note the style spec accepts *any* string here, so an unsupported value
 * validates cleanly and then silently does nothing.
 */
export type ProjectionOptions = 'globe' | 'mercator' | 'vertical-perspective';

export type ResolvedProjection = ProjectionOptions;

export function resolveProjection(projection?: ProjectionOptions): ResolvedProjection {
	return projection ?? 'globe';
}

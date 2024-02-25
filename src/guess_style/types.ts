
export interface GuessContainerOptions {
	tiles: string[];
	attribution?: string;
	baseUrl?: string;
	bounds?: [number, number, number, number];
	center?: [number, number];
	description?: string;
	fillzoom?: number;
	glyphs?: string;
	grids?: string[];
	legend?: string;
	maxzoom?: number;
	minzoom?: number;
	name?: string;
	scheme?: 'tms' | 'xyz';
	sprite?: string;
	template?: string;
}

/** Options for creating TileJSON, extending the basic specification with format and optional vector layers. */
export interface GuessStyleOptions extends GuessContainerOptions {
	format: 'avif' | 'jpg' | 'pbf' | 'png' | 'webp';
	vectorLayers?: unknown[];
}

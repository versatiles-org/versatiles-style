// Icons for the `extras` sheet — the public, add-only pins, badges, shapes, symbols and patterns
// developers place themselves. Pictograms have a sheet of their own, see icons-icons.ts.
//
// The key is the sprite name (`extras:<group>-<key>`), the value is the file it is drawn from,
// relative to `icons/` and without the `.svg`. Files are organized by PROVENANCE and keep their
// upstream filename, so the two are deliberately independent — see SPRITES.md.
//
// `title`, `aliases` and `center` are published INSIDE the sprite JSON, so a picker needs no
// second request. Every entry needs a title and config/sprites.test.ts fails without one; aliases
// are the other terms someone might type, and `center` marks where an icon POINTS when that is not
// its own middle — a pin's tip, an arrow's head.

import type { IconSets } from '../lib/icons.js';

const icons: IconSets = {
	badge: {
		size: 22,
		icons: {
			number_0: {
				src: 'versatiles/number_0',
				title: 'Badge 0',
				aliases: ['badge', 'number', 'digit', '0', 'numbered'],
			},
			number_0_outline: {
				src: 'versatiles/number_0_outline',
				title: 'Badge 0, outlined',
				aliases: ['badge', 'number', 'digit', '0', 'numbered', 'outline'],
			},
			number_1: {
				src: 'versatiles/number_1',
				title: 'Badge 1',
				aliases: ['badge', 'number', 'digit', '1', 'numbered'],
			},
			number_1_outline: {
				src: 'versatiles/number_1_outline',
				title: 'Badge 1, outlined',
				aliases: ['badge', 'number', 'digit', '1', 'numbered', 'outline'],
			},
			number_2: {
				src: 'versatiles/number_2',
				title: 'Badge 2',
				aliases: ['badge', 'number', 'digit', '2', 'numbered'],
			},
			number_2_outline: {
				src: 'versatiles/number_2_outline',
				title: 'Badge 2, outlined',
				aliases: ['badge', 'number', 'digit', '2', 'numbered', 'outline'],
			},
			number_3: {
				src: 'versatiles/number_3',
				title: 'Badge 3',
				aliases: ['badge', 'number', 'digit', '3', 'numbered'],
			},
			number_3_outline: {
				src: 'versatiles/number_3_outline',
				title: 'Badge 3, outlined',
				aliases: ['badge', 'number', 'digit', '3', 'numbered', 'outline'],
			},
			number_4: {
				src: 'versatiles/number_4',
				title: 'Badge 4',
				aliases: ['badge', 'number', 'digit', '4', 'numbered'],
			},
			number_4_outline: {
				src: 'versatiles/number_4_outline',
				title: 'Badge 4, outlined',
				aliases: ['badge', 'number', 'digit', '4', 'numbered', 'outline'],
			},
			number_5: {
				src: 'versatiles/number_5',
				title: 'Badge 5',
				aliases: ['badge', 'number', 'digit', '5', 'numbered'],
			},
			number_5_outline: {
				src: 'versatiles/number_5_outline',
				title: 'Badge 5, outlined',
				aliases: ['badge', 'number', 'digit', '5', 'numbered', 'outline'],
			},
			number_6: {
				src: 'versatiles/number_6',
				title: 'Badge 6',
				aliases: ['badge', 'number', 'digit', '6', 'numbered'],
			},
			number_6_outline: {
				src: 'versatiles/number_6_outline',
				title: 'Badge 6, outlined',
				aliases: ['badge', 'number', 'digit', '6', 'numbered', 'outline'],
			},
			number_7: {
				src: 'versatiles/number_7',
				title: 'Badge 7',
				aliases: ['badge', 'number', 'digit', '7', 'numbered'],
			},
			number_7_outline: {
				src: 'versatiles/number_7_outline',
				title: 'Badge 7, outlined',
				aliases: ['badge', 'number', 'digit', '7', 'numbered', 'outline'],
			},
			number_8: {
				src: 'versatiles/number_8',
				title: 'Badge 8',
				aliases: ['badge', 'number', 'digit', '8', 'numbered'],
			},
			number_8_outline: {
				src: 'versatiles/number_8_outline',
				title: 'Badge 8, outlined',
				aliases: ['badge', 'number', 'digit', '8', 'numbered', 'outline'],
			},
			number_9: {
				src: 'versatiles/number_9',
				title: 'Badge 9',
				aliases: ['badge', 'number', 'digit', '9', 'numbered'],
			},
			number_9_outline: {
				src: 'versatiles/number_9_outline',
				title: 'Badge 9, outlined',
				aliases: ['badge', 'number', 'digit', '9', 'numbered', 'outline'],
			},
		},
	},
	pattern: {
		useSDF: false,
		size: 16,
		icons: {
			checker: {
				src: 'versatiles/checker',
				title: 'Checkerboard fill',
				aliases: ['checkerboard', 'squares', 'chequered', 'fill'],
			},
			crosshatch: {
				src: 'versatiles/crosshatch',
				title: 'Crossed diagonal lines',
				aliases: ['hatching', 'diagonal', 'lattice', 'fill', 'texture'],
			},
			dots: {
				src: 'versatiles/dots',
				title: 'Evenly spaced dot grid',
				aliases: ['dotted', 'stipple', 'points', 'fill', 'texture'],
			},
			grid: {
				src: 'versatiles/grid',
				title: 'Orthogonal grid',
				aliases: ['squares', 'graph', 'mesh', 'lines', 'fill'],
			},
			zigzag: {
				src: 'versatiles/zigzag',
				title: 'Stacked zigzag bands',
				aliases: ['chevron', 'wave', 'sawtooth', 'fill', 'texture'],
			},
		},
	},
	// Map pins, drawn 24×30 with the tip ON the bottom edge so `icon-anchor: "bottom"` puts the
	// point on the coordinate — which is also what `center: [0.5, 1]` tells a picker. `size` is
	// the rendered HEIGHT; the width follows from the source aspect ratio (see Sprite.fromIcons):
	// round(28 × 24/30) = round(22.4) = 22 → 22×28 on the sheet. config/sprites.test.ts guards it.
	pin: {
		size: 28,
		icons: {
			balloon: {
				src: 'versatiles/balloon',
				title: 'Balloon pin',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'round head'],
				center: [0.5, 1],
			},
			balloon_outline: {
				src: 'versatiles/balloon_outline',
				title: 'Balloon pin, outlined',
				aliases: [
					'pin',
					'marker',
					'map pin',
					'location',
					'place',
					'point',
					'round head',
					'balloon',
					'outline',
					'hollow',
				],
				center: [0.5, 1],
			},
			teardrop: {
				src: 'versatiles/teardrop',
				title: 'Map pin',
				aliases: ['pin', 'marker', 'location', 'place', 'point'],
				center: [0.5, 1],
			},
			teardrop_1: {
				src: 'versatiles/teardrop_1',
				title: 'Map pin 1',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '1', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_2: {
				src: 'versatiles/teardrop_2',
				title: 'Map pin 2',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '2', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_3: {
				src: 'versatiles/teardrop_3',
				title: 'Map pin 3',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '3', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_4: {
				src: 'versatiles/teardrop_4',
				title: 'Map pin 4',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '4', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_5: {
				src: 'versatiles/teardrop_5',
				title: 'Map pin 5',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '5', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_6: {
				src: 'versatiles/teardrop_6',
				title: 'Map pin 6',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '6', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_7: {
				src: 'versatiles/teardrop_7',
				title: 'Map pin 7',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '7', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_8: {
				src: 'versatiles/teardrop_8',
				title: 'Map pin 8',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '8', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_9: {
				src: 'versatiles/teardrop_9',
				title: 'Map pin 9',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '9', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_dot: {
				src: 'versatiles/teardrop_dot',
				title: 'Map pin with a dot',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'dot'],
				center: [0.5, 1],
			},
			teardrop_hole: {
				src: 'versatiles/teardrop_hole',
				title: 'Map pin with a well',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'knockout', 'composable', 'two-layer'],
				center: [0.5, 1],
			},
			teardrop_outline: {
				src: 'versatiles/teardrop_outline',
				title: 'Map pin, outlined',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'outline', 'hollow'],
				center: [0.5, 1],
			},
		},
	},
	shape: {
		size: 22,
		icons: {
			circle: {
				src: 'versatiles/circle',
				title: 'Circle',
				aliases: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot'],
			},
			circle_outline: {
				src: 'versatiles/circle_outline',
				title: 'Circle, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot', 'outline', 'hollow', 'stroked'],
			},
			cross: {
				src: 'versatiles/cross',
				title: 'Cross',
				aliases: ['shape', 'geometric', 'category', 'series', 'plus', 'add', 'medical', 'aid'],
			},
			cross_outline: {
				src: 'versatiles/cross_outline',
				title: 'Cross, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'plus',
					'add',
					'medical',
					'aid',
					'outline',
					'hollow',
					'stroked',
				],
			},
			diamond: {
				src: 'versatiles/diamond',
				title: 'Diamond',
				aliases: ['shape', 'geometric', 'category', 'series', 'rhombus', 'rotated square'],
			},
			diamond_outline: {
				src: 'versatiles/diamond_outline',
				title: 'Diamond, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'rhombus',
					'rotated square',
					'outline',
					'hollow',
					'stroked',
				],
			},
			drop: {
				src: 'versatiles/drop',
				title: 'Drop',
				aliases: ['shape', 'geometric', 'category', 'series', 'teardrop', 'water', 'droplet'],
			},
			drop_outline: {
				src: 'versatiles/drop_outline',
				title: 'Drop, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'teardrop',
					'water',
					'droplet',
					'outline',
					'hollow',
					'stroked',
				],
			},
			heart: {
				src: 'maki/heart',
				title: 'Heart',
				aliases: ['shape', 'geometric', 'category', 'series', 'love', 'favourite', 'favorite', 'like'],
			},
			heart_outline: {
				src: 'versatiles/heart_outline',
				title: 'Heart, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'love',
					'favourite',
					'favorite',
					'like',
					'outline',
					'hollow',
					'stroked',
				],
			},
			hexagon: {
				src: 'versatiles/hexagon',
				title: 'Hexagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex'],
			},
			hexagon_outline: {
				src: 'versatiles/hexagon_outline',
				title: 'Hexagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex', 'outline', 'hollow', 'stroked'],
			},
			octagon: {
				src: 'versatiles/octagon',
				title: 'Octagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop'],
			},
			octagon_outline: {
				src: 'versatiles/octagon_outline',
				title: 'Octagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop', 'outline', 'hollow', 'stroked'],
			},
			oval: {
				src: 'versatiles/oval',
				title: 'Oval',
				aliases: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round'],
			},
			oval_outline: {
				src: 'versatiles/oval_outline',
				title: 'Oval, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round', 'outline', 'hollow', 'stroked'],
			},
			pentagon: {
				src: 'versatiles/pentagon',
				title: 'Pentagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'five-sided'],
			},
			pentagon_outline: {
				src: 'versatiles/pentagon_outline',
				title: 'Pentagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'five-sided', 'outline', 'hollow', 'stroked'],
			},
			rounded_square: {
				src: 'versatiles/rounded_square',
				title: 'Rounded square',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded'],
			},
			rounded_square_outline: {
				src: 'versatiles/rounded_square_outline',
				title: 'Rounded square, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded', 'outline', 'hollow', 'stroked'],
			},
			square: {
				src: 'versatiles/square',
				title: 'Square',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile'],
			},
			square_outline: {
				src: 'versatiles/square_outline',
				title: 'Square, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'outline', 'hollow', 'stroked'],
			},
			star: {
				src: 'versatiles/star',
				title: 'Star',
				aliases: ['shape', 'geometric', 'category', 'series', 'favourite', 'favorite', 'rating', 'five-point'],
			},
			star4: {
				src: 'versatiles/star4',
				title: 'Four-point star',
				aliases: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point'],
			},
			star4_outline: {
				src: 'versatiles/star4_outline',
				title: 'Four-point star, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point', 'outline', 'hollow', 'stroked'],
			},
			star6: {
				src: 'versatiles/star6',
				title: 'Six-point star',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram'],
			},
			star6_outline: {
				src: 'versatiles/star6_outline',
				title: 'Six-point star, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram', 'outline', 'hollow', 'stroked'],
			},
			star_outline: {
				src: 'versatiles/star_outline',
				title: 'Star, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'favourite',
					'favorite',
					'rating',
					'five-point',
					'outline',
					'hollow',
					'stroked',
				],
			},
			triangle: {
				src: 'versatiles/triangle',
				title: 'Triangle',
				aliases: ['shape', 'geometric', 'category', 'series', 'three-sided'],
			},
			triangle_outline: {
				src: 'versatiles/triangle_outline',
				title: 'Triangle, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'three-sided', 'outline', 'hollow', 'stroked'],
			},
			x: {
				src: 'versatiles/x',
				title: 'X',
				aliases: ['shape', 'geometric', 'category', 'series', 'close', 'cancel', 'remove', 'ex'],
			},
			x_outline: {
				src: 'versatiles/x_outline',
				title: 'X, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'close',
					'cancel',
					'remove',
					'ex',
					'outline',
					'hollow',
					'stroked',
				],
			},
		},
	},
	// Directional marks carry a `center` at their TIP, measured off the rendered artwork, so a
	// tool can put the point where the arrow indicates rather than at the middle of its box.
	// `arrow_double` has two tips and `arrow_circle` is a button, so neither declares one.
	symbol: {
		size: 22,
		icons: {
			arrow: {
				src: 'maki/arrow',
				title: 'Arrow',
				aliases: ['direction', 'pointer', 'right', 'thin'],
				center: [0.96, 0.5],
			},
			arrow2: {
				src: 'unknown/arrow2',
				title: 'Arrow2',
				aliases: ['direction', 'pointer', 'block', 'solid'],
				center: [0.93, 0.5],
			},
			arrow3: {
				src: 'unknown/arrow3',
				title: 'Arrow3',
				aliases: ['direction', 'pointer', 'dart'],
				center: [0.93, 0.5],
			},
			arrow_circle: {
				src: 'versatiles/arrow_circle',
				title: 'Arrow in a ring',
				aliases: ['direction', 'button', 'round', 'enclosed'],
			},
			arrow_curved: {
				src: 'versatiles/arrow_curved',
				title: 'Curved arrow',
				aliases: ['turn', 'detour', 'bend', 'route'],
				center: [0.83, 0.25],
			},
			arrow_double: {
				src: 'versatiles/arrow_double',
				title: 'Double arrow',
				aliases: ['bidirectional', 'two-way', 'both ways'],
			},
			arrow_return: {
				src: 'versatiles/arrow_return',
				title: 'Return arrow',
				aliases: ['back', 'undo', 'u-turn', 'reverse', 'round trip'],
				center: [0.24, 0.64],
			},
			caret: {
				src: 'versatiles/caret',
				title: 'Caret',
				aliases: ['triangle', 'pointer', 'next', 'expand', 'small'],
				center: [0.7, 0.5],
			},
			chart_bar: {
				src: 'versatiles/chart_bar',
				title: 'Bar chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'bars'],
			},
			chart_line: {
				src: 'versatiles/chart_line',
				title: 'Line chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'trend', 'series'],
			},
			chart_pie: {
				src: 'versatiles/chart_pie',
				title: 'Pie chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'share', 'proportion'],
			},
			check: {
				src: 'versatiles/check',
				title: 'Check',
				aliases: ['tick', 'done', 'confirm', 'yes', 'verified', 'available'],
			},
			chevron: {
				src: 'versatiles/chevron',
				title: 'Chevron',
				aliases: ['angle', 'flow', 'next', 'direction'],
				center: [0.75, 0.5],
			},
			chevron_double: {
				src: 'versatiles/chevron_double',
				title: 'Double chevron',
				aliases: ['fast', 'skip', 'flow', 'direction'],
				center: [0.86, 0.5],
			},
			crosshair: {
				src: 'versatiles/crosshair',
				title: 'Crosshair',
				aliases: ['target', 'precision', 'locate', 'aim', 'measurement'],
			},
			dot: { src: 'versatiles/dot', title: 'Dot', aliases: ['point', 'bullet', 'small', 'data point'] },
			entrance: {
				src: 'maki/entrance-alt1',
				title: 'Entrance',
				aliases: ['enter', 'way in', 'access', 'door', 'login'],
			},
			exclamation: {
				src: 'versatiles/exclamation',
				title: 'Exclamation',
				aliases: ['attention', 'alert', 'important', 'notice'],
			},
			minus: { src: 'versatiles/minus', title: 'Minus', aliases: ['remove', 'subtract', 'less', 'negative', 'closed'] },
			percent: { src: 'versatiles/percent', title: 'Percent', aliases: ['share', 'proportion', 'rate', 'statistics'] },
			question: { src: 'versatiles/question', title: 'Question', aliases: ['unknown', 'help', 'unconfirmed', 'query'] },
			slash: {
				src: 'versatiles/slash',
				title: 'Slash',
				aliases: ['cancelled', 'struck through', 'disabled', 'out of service'],
			},
			trend_down: {
				src: 'versatiles/trend_down',
				title: 'Trend down',
				aliases: ['decrease', 'fall', 'decline', 'negative', 'statistics'],
				center: [0.89, 0.8],
			},
			trend_up: {
				src: 'versatiles/trend_up',
				title: 'Trend up',
				aliases: ['increase', 'rise', 'growth', 'positive', 'statistics'],
				center: [0.89, 0.19],
			},
		},
	},
};

export default icons;

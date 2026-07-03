import { SLOT_BELOW_FILLS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS, SLOT_BELOW_LABELS } from './layers/index.js';

// ── Slot IDs for osm.slots ────────────────────────────────────────────────────

export const SLOT_IDS = {
	belowFills: SLOT_BELOW_FILLS,
	belowStreets: SLOT_BELOW_STREETS,
	belowSymbols: SLOT_BELOW_SYMBOLS,
	belowLabels: SLOT_BELOW_LABELS,
} as const;

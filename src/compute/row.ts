// src/compute/row.ts — the typed daily row produced by parse.ts.

import type { ChartField } from './parse.js';

export type DailyRow = { date: string } & Record<ChartField, number | null>;

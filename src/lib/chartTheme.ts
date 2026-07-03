// Shared ECharts fragments for the dark theme: recessive axes/grid,
// readable tooltip, text in ink tokens (never in series colors).

export const INK = '#e8eaed';
export const INK_DIM = '#9aa4b2';
export const GRID_LINE = '#242b35';
export const AXIS_LINE = '#2c3440';

export const axisStyle = {
  axisLine: { lineStyle: { color: AXIS_LINE } },
  axisTick: { lineStyle: { color: AXIS_LINE } },
  axisLabel: { color: INK_DIM, fontSize: 11 },
  splitLine: { lineStyle: { color: GRID_LINE } },
};

export const tooltipStyle = {
  backgroundColor: '#20262f',
  borderColor: AXIS_LINE,
  textStyle: { color: INK, fontSize: 12 },
};

export const legendStyle = {
  textStyle: { color: INK_DIM, fontSize: 12 },
  icon: 'roundRect',
  itemWidth: 14,
  itemHeight: 4,
};

// F1 tyre-compound convention. The letter is always rendered on the stint
// segment, so compound identity is never color-alone.
export const COMPOUNDS: Record<string, { color: string; letter: string; labelPt: string; darkText: boolean }> = {
  SOFT: { color: '#DA291C', letter: 'S', labelPt: 'Macio', darkText: false },
  MEDIUM: { color: '#FFD12E', letter: 'M', labelPt: 'Médio', darkText: true },
  HARD: { color: '#F0F0EC', letter: 'H', labelPt: 'Duro', darkText: true },
  INTERMEDIATE: { color: '#43B02A', letter: 'I', labelPt: 'Intermediário', darkText: false },
  WET: { color: '#0067AD', letter: 'W', labelPt: 'Chuva', darkText: false },
};

export function compoundInfo(compound: string | null) {
  return (
    (compound && COMPOUNDS[compound.toUpperCase()]) || {
      color: '#5c6672',
      letter: '?',
      labelPt: compound ?? 'desconhecido',
      darkText: false,
    }
  );
}

// High-entropy avalanche hash. A 1-character difference creates a massively different number.
function getHash(str: string): number {
  let h = 0xdeadbeef;
  for(let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return (h ^ h >>> 16) >>> 0;
}

export function getBookThickness(seedString: string): number {
  // Thickness bounds: 15px minimum, up to +70px extra
  return 15 + (getHash(seedString) % 71);
}

// Generates a permanent, bright color band based on the series name
export function getSeriesColor(series: string): string {
  const hash = getHash(series.toLowerCase().trim());
  const hue = hash % 360;
  return `hsl(${hue}, 85%, 50%)`;
}

export function useSeededStyle(seedString: string) {
  const positiveHash = getHash(seedString);

  const hue = positiveHash % 360;
  const saturation = 40 + (positiveHash % 31);
  const lightness = 20 + (positiveHash % 31);
  const isDark = lightness < 40;
  
  // NEW: Minimum height raised to 70%, with a max variance of +30% (capping at 100%)
  const heightPct = 70 + (positiveHash % 31);
  const thicknessPx = getBookThickness(seedString);

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    color: isDark ? '#ffffff' : '#111111',
    height: `${heightPct}%`,
    width: `${thicknessPx}px`,
  };
}
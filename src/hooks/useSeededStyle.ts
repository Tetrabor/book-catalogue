export function getBookThickness(seedString: string): number {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Skinnier and wider bounds: 15px minimum, up to +70px extra
  return 15 + (Math.abs(hash) % 71);
}

export function useSeededStyle(seedString: string) {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const positiveHash = Math.abs(hash);

  const hue = positiveHash % 360;
  const saturation = 40 + (positiveHash % 31);
  const lightness = 20 + (positiveHash % 31);
  const isDark = lightness < 40;
  
  // Taller and shorter bounds: 55% minimum, up to +45% extra
  const heightPct = 55 + (positiveHash % 46);
  
  const thicknessPx = getBookThickness(seedString);

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    color: isDark ? '#ffffff' : '#111111',
    height: `${heightPct}%`,
    width: `${thicknessPx}px`,
  };
}
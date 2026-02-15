/** Format tag value for display (e.g. neapolitan_pizza → Neapolitan pizza). */
export function formatTagForDisplay(tag: string): string {
  return tag
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

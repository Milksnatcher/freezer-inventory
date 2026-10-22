export type Freshness = 'green' | 'amber' | 'red';
// sage / amber / clay from the app palette
export const FRESH_COLORS = { green: '#4E8267', amber: '#B8923F', red: '#B45E4C' };

export function freshness(ageDate: string | Date, now = new Date()): Freshness {
  const months = (now.getTime() - new Date(ageDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  return months < 2 ? 'green' : months < 6 ? 'amber' : 'red';
}

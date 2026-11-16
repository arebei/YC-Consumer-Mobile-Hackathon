/** Standard competition ranking over a list already sorted best-first: ties share the lower number (1, 1, 3). */
export function withRanks<T>(rows: T[], value: (r: T) => number): (T & { rank: number })[] {
  let prevValue: number | null = null;
  let prevRank = 0;
  return rows.map((r, i) => {
    const v = value(r);
    const rank = prevValue !== null && v === prevValue ? prevRank : i + 1;
    prevValue = v;
    prevRank = rank;
    return { ...r, rank };
  });
}

/** "#4 of 12 by points", or null when the player is not on the board. */
export function rankLine<T extends { playerId: string }>(
  rows: T[] | undefined,
  value: (r: T) => number,
  playerId: string | undefined,
  by: string,
): string | null | undefined {
  if (rows === undefined) return undefined;
  const ranked = withRanks(rows, value);
  const me = ranked.find((r) => r.playerId === playerId);
  return me ? `#${me.rank} of ${ranked.length} by ${by}` : null;
}

export function myRank<T extends { playerId: string }>(
  rows: T[] | undefined,
  value: (r: T) => number,
  playerId: string | undefined,
): number | null | undefined {
  if (rows === undefined) return undefined;
  return withRanks(rows, value).find((r) => r.playerId === playerId)?.rank ?? null;
}

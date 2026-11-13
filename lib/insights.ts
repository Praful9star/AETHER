// What your sky says, counted.
//
// A sky is a record of what somebody thought and when. This reads it back as
// a handful of plain counts: which thoughts keep returning, when thoughts
// tend to arrive, how many you went back to. Everything here runs in the
// browser over data that is already in the browser, so nothing new is
// collected and nothing is sent anywhere to produce it.
//
// The rule for every line this produces: a count and never a verdict. "This
// thought has come back five times" is something a person can look at and
// decide about. "You are overthinking" is a judgement, and a diagnosis
// dressed as a statistic is the thing this product has refused to be since
// the first line of its prompt. So there are no scores, no "wellness"
// numbers, no trends labelled good or bad, and small samples say nothing at
// all rather than something confident.

export type Insightable = {
  id: number;
  thought?: string;
  answer?: string;
  loopOf?: number;
};

export type LoopSummary = {
  rootId: number;
  /** The thought as it was first written. */
  thought: string;
  /** Times this loop was entered, the first included. */
  visits: number;
  firstAt: number;
  lastAt: number;
};

export type Insights = {
  total: number;
  /** Loops entered at least twice, most-visited first. */
  loops: LoopSummary[];
  /** Thoughts that are a return to an earlier one. */
  returns: number;
  /** Thoughts you answered Aether's question about. */
  answered: number;
  /** Days between the first thought and the last. */
  spanDays: number;
  /**
   * The three-hour window most thoughts arrive in, or null when there are too
   * few thoughts, or no window holds enough of them, for that to mean anything.
   */
  peak: { startHour: number; count: number; share: number } | null;
};

const isTime = (id: number) => id > 1e12;

export function insights<T extends Insightable>(
  stars: T[],
  hourOf: (ms: number) => number = (ms) => new Date(ms).getHours()
): Insights {
  const total = stars.length;
  const byId = new Map<number, T>();
  for (const s of stars) byId.set(s.id, s);

  const groups = new Map<number, T[]>();
  let returns = 0;
  for (const s of stars) {
    if (s.loopOf != null && s.loopOf !== s.id && byId.has(s.loopOf)) {
      returns++;
      const g = groups.get(s.loopOf) ?? [];
      g.push(s);
      groups.set(s.loopOf, g);
    }
  }
  const loops: LoopSummary[] = [];
  groups.forEach((members, rootId) => {
    const root = byId.get(rootId)!;
    const ids = [rootId, ...members.map((m) => m.id)];
    loops.push({
      rootId,
      thought: root.thought || "",
      visits: members.length + 1,
      firstAt: Math.min(...ids),
      lastAt: Math.max(...ids),
    });
  });
  loops.sort((a, b) => b.visits - a.visits || b.lastAt - a.lastAt);

  const answered = stars.filter((s) => !!s.answer).length;

  const times = stars.map((s) => s.id).filter(isTime);
  const spanDays = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 86400000) : 0;

  // The hour pattern. Below eight thoughts, or when the busiest window holds
  // under 40% of them, it stays silent: three thoughts at midnight is a
  // Tuesday, not a pattern.
  let peak: Insights["peak"] = null;
  if (times.length >= 8) {
    const hist = new Array(24).fill(0);
    for (const t of times) hist[((hourOf(t) % 24) + 24) % 24]++;
    let best = 0, bestStart = 0;
    for (let h = 0; h < 24; h++) {
      const c = hist[h] + hist[(h + 1) % 24] + hist[(h + 2) % 24];
      if (c > best) { best = c; bestStart = h; }
    }
    const share = best / times.length;
    if (share >= 0.4) peak = { startHour: bestStart, count: best, share };
  }

  return { total, loops, returns, answered, spanDays, peak };
}

/** "11pm – 2am". A window that wraps midnight reads naturally. */
export function hourWindow(startHour: number): string {
  const f = (h: number) => {
    const x = ((h % 24) + 24) % 24;
    return x === 0 ? "12am" : x === 12 ? "12pm" : x < 12 ? `${x}am` : `${x - 12}pm`;
  };
  return `${f(startHour)} – ${f(startHour + 3)}`;
}

// ── Taking your sky with you ────────────────────────────────────────────────
//
// The privacy note used to say "there is no export yet — you should be able
// to, and that is next". This is that. One file, everything the browser
// holds about your sky, in a format a person can open and read.
//
// The stored row's id is left out: it is an internal handle to a copy on our
// server, means nothing to its owner, and is the one field in a star that
// could be used against the account if the file were shared.

export const EXPORT_VERSION = 1;

export function exportSky(stars: Record<string, any>[], now: number): string {
  return JSON.stringify(
    {
      app: "Aether",
      version: EXPORT_VERSION,
      exportedAt: new Date(now).toISOString(),
      count: stars.length,
      note: "Your thoughts, exactly as this browser holds them. Voice recordings are not included: they are never stored.",
      stars: stars.map(({ dbId, ...rest }) => ({
        ...rest,
        writtenAt: isTime(rest.id) ? new Date(rest.id).toISOString() : null,
      })),
    },
    null,
    2
  );
}

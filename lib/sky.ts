// Where a remembered star sits, once time has had its say.
//
// In lib/ rather than beside the canvas because it is pure arithmetic that
// decides where every star in everybody's sky appears. Getting it wrong moves
// somebody's whole record of themselves, so it is tested.

/** Structurally what this needs from a star; SavedStar satisfies it. */
export type Receding = {
  id: number;
  pos: [number, number, number];
  answer?: string;
  turns?: { q: string; a: string }[];
};

// ── The sky recedes ─────────────────────────────────────────────────────────
// starPos puts a star in a direction that means something — hue sets the
// azimuth, energy the polar angle. It leaves the radius as noise, and the
// radius is the one axis in a sky that needs no explaining: distance is how
// far away a thing is.
//
// So distance is time. A thought given an hour ago is close enough to touch.
// One from a month ago has drifted out toward the edge of what you can see.
// Nothing new has to be stored for this to work — every star's id is the
// millisecond it was made, so every sky anybody already has becomes a record
// of when, retroactively and all at once.
//
// And it reverses. A thought you came back to and answered is held closer,
// because the point of the sky is to show which thoughts you returned to.
// The direction is never touched, so the meaning starPos encoded survives
// and only the distance moves.
export const RECEDE_NEAR=52, RECEDE_FAR=78;
export const RECEDE_FULL_DAYS=180;   // where the drift asymptotes, so a year stays in frame

export function recedeRadius(s: Receding, now: number): number {
  const saved=Math.hypot(s.pos[0],s.pos[1],s.pos[2]);
  // Not a millisecond timestamp — a hand-made id, an import, a clock set
  // wrong. Leave such a star exactly where it was rather than guessing.
  if (!(s.id>1e12) || now<s.id) return saved||RECEDE_NEAR;
  const ageDays=(now-s.id)/86400000;
  // Logarithmic: the first days have to move perceptibly or the idea is
  // invisible, and a year must not push a star out of the sky.
  const t=Math.min(1,Math.log10(1+ageDays)/Math.log10(1+RECEDE_FULL_DAYS));
  let r=RECEDE_NEAR+(RECEDE_FAR-RECEDE_NEAR)*t;
  if (s.answer) r-=4;
  if (s.turns?.length) r-=2*Math.min(2,s.turns.length);
  return Math.max(RECEDE_NEAR-6,r);
}

// ── Two skies becoming one ──────────────────────────────────────────────────
//
// Until accounts existed there was only ever one copy of a sky: whatever was
// in this browser's localStorage. Signing in produces a second, and they
// overlap — the stored rows include everything written on this device while
// signed in, so a naive concatenation doubles every one of them.
//
// Which copy wins matters. Local wins, deliberately: a local star carries the
// answers and the exchange turns that pull it closer (recedeRadius reads
// both), and the stored row is a snapshot taken at the moment the thought was
// made, before any of that happened. Preferring the remote copy would quietly
// throw away the record of which thoughts somebody returned to, which is the
// single most meaningful thing the sky knows.

export type Mergeable = {
  id: number;
  thought?: string;
  whisper: string;
};

/** Same thought, same answer: the same star, wherever the copy came from. */
function identity(s: Mergeable): string {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(s.thought || "") + "\u0000" + norm(s.whisper || "");
}

/**
 * Local first, then any remote star not already present, oldest to newest,
 * capped from the newest end.
 *
 * Returns the local array unchanged when there is nothing to add, so a caller
 * can compare by reference and skip rebuilding the scene — which costs a full
 * geometry rebuild of every star in the sky.
 */
export function mergeStars<T extends Mergeable>(local: T[], remote: T[], cap = 120): T[] {
  if (!remote.length) return local;
  const seen = new Set(local.map(identity));
  const extra = remote.filter((r) => {
    const k = identity(r);
    if (seen.has(k)) return false;
    seen.add(k);   // a remote list can hold duplicates of its own
    return true;
  });
  if (!extra.length) return local;
  return [...local, ...extra].sort((a, b) => a.id - b.id).slice(-cap);
}

/** The direction starPos chose, at the distance time has moved it to. */
export function recededPos(s: Receding, now: number): [number,number,number] {
  const len=Math.hypot(s.pos[0],s.pos[1],s.pos[2]);
  if (!len) return s.pos;
  const r=recedeRadius(s,now)/len;
  return [s.pos[0]*r, s.pos[1]*r, s.pos[2]*r];
}


// ── The loop, made visible ──────────────────────────────────────────────────
//
// Overthinking is the same thought arriving again. Until now each arrival
// became a new star somewhere else in the sky, so the one pattern this
// product exists for was the one thing the sky could not show: ten returns to
// one worry looked like ten unrelated thoughts.
//
// Now a thought that comes back does not get a place of its own. It gathers
// beside the star it repeats — a pair, then three, then a tight cluster — so
// the loop is a shape you can see from across the sky, and its size is the
// number of times you went round.
//
// Matching is deliberately conservative. Joining two thoughts that were not
// the same one is worse than missing a repeat: it tells somebody they are
// looping when they are not, and it does so in the one place they came to be
// believed.

const STOP = new Set([
  "that","this","with","have","from","they","them","then","than","what","when",
  "will","would","could","should","about","there","their","been","were","just",
  "like","really","always","never","every","still","keep","keeps","kept","because",
  "want","dont","cant","into","over","again","very","much","more","some","feel",
  "feels","feeling","think","thinking","thought","know","going","being","myself",
]);

/** The words of a thought that carry what it is about. */
export function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().replace(/[‘’']/g, "").match(/[a-z]{4,}/g) ?? []) {
    if (!STOP.has(w)) out.add(w);
  }
  return out;
}

export type Loopable = { id: number; thought?: string; loopOf?: number };

/**
 * The star this thought is a return to, or null.
 *
 * Two thoughts are the same loop when they are word-for-word the same, or
 * share at least two content words that make up 60% of the shorter one. One
 * shared word is not enough — "exam" appears in a great many different
 * worries. The answer is always a ROOT: a match against a star that is itself
 * a return resolves to the star it returned to, so a loop has one centre
 * however many times it is entered.
 */
export function findLoopRoot<T extends Loopable>(text: string, prior: T[]): number | null {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  const mine = contentWords(text);
  const me = norm(text);
  if (!me) return null;

  let best: T | null = null;
  let bestScore = 0;
  for (const s of prior) {
    const t = s.thought || "";
    if (!t) continue;
    let score = 0;
    if (norm(t) === me) score = 2;
    else if (mine.size >= 2) {
      const theirs = contentWords(t);
      let shared = 0;
      mine.forEach((w) => { if (theirs.has(w)) shared++; });
      const ratio = shared / Math.max(1, Math.min(mine.size, theirs.size));
      if (shared >= 2 && ratio >= 0.6) score = ratio;
    }
    // Strictly greater, so on a tie the OLDEST match wins: the loop's centre
    // is where it started.
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (!best) return null;
  return best.loopOf ?? best.id;
}

/** How many times a loop has been entered, its first star included. */
export function loopSize<T extends Loopable>(stars: T[], rootId: number): number {
  let n = 0;
  for (const s of stars) if (s.id === rootId || s.loopOf === rootId) n++;
  return n;
}

const GOLDEN = 2.399963229728653;
export const LOOP_RADIUS = 2.4;

/**
 * Where the k-th return sits: on a small ring around its root, facing the
 * viewer. The ring is built perpendicular to the line of sight so a cluster
 * reads as a cluster from the centre of the sky rather than as a line, and the
 * golden angle keeps any number of companions from stacking.
 */
export function companionPos(root: [number, number, number], k: number): [number, number, number] {
  const len = Math.hypot(root[0], root[1], root[2]) || 1;
  const u = [root[0] / len, root[1] / len, root[2] / len];
  // Any vector not parallel to u will do to build the tangent plane.
  const ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let t1 = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
  const l1 = Math.hypot(t1[0], t1[1], t1[2]) || 1;
  t1 = [t1[0] / l1, t1[1] / l1, t1[2] / l1];
  const t2 = [u[1] * t1[2] - u[2] * t1[1], u[2] * t1[0] - u[0] * t1[2], u[0] * t1[1] - u[1] * t1[0]];
  const a = k * GOLDEN;
  const r = LOOP_RADIUS * (1 + 0.25 * Math.floor(k / 6));
  const c = Math.cos(a) * r, s = Math.sin(a) * r;
  return [root[0] + c * t1[0] + s * t2[0], root[1] + c * t1[1] + s * t2[1], root[2] + c * t1[2] + s * t2[2]];
}

/**
 * Every star's place in the sky: its own receded position, unless it is a
 * return, in which case it gathers beside its root. A return whose root is
 * not in the list (deleted, or beyond the cap) simply keeps its own place.
 */
export function skyLayout<T extends Receding & Loopable>(stars: T[], now: number): [number, number, number][] {
  const base = stars.map((s) => recededPos(s, now));
  const at = new Map<number, number>();
  stars.forEach((s, i) => at.set(s.id, i));
  const seen = new Map<number, number>();
  return stars.map((s, i) => {
    const r = s.loopOf != null && s.loopOf !== s.id ? at.get(s.loopOf) : undefined;
    if (r === undefined) return base[i];
    const k = seen.get(s.loopOf!) ?? 0;
    seen.set(s.loopOf!, k + 1);
    return companionPos(base[r], k);
  });
}

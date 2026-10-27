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

/** The direction starPos chose, at the distance time has moved it to. */
export function recededPos(s: Receding, now: number): [number,number,number] {
  const len=Math.hypot(s.pos[0],s.pos[1],s.pos[2]);
  if (!len) return s.pos;
  const r=recedeRadius(s,now)/len;
  return [s.pos[0]*r, s.pos[1]*r, s.pos[2]*r];
}


// The rules of the exchange, in one place.
//
// /api/whisper asks the first question. /api/reply carries the conversation
// on from there. Both need the same guards, and the guards are the product:
// a model left to its own devices writes "why do you think you feel that
// way?" and "that must be really hard" — which are the two things this
// instrument must never say.
//
// Nothing here calls a model. It validates what one returned, and it has a
// defensible answer ready for every way that can go wrong.

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * How many questions Aether may ask in one exchange, in total — the first
 * from /api/whisper, the rest from /api/reply.
 *
 * Three, and the number is the decision. The MIT Media Lab / OpenAI trial
 * (n=981) found a spoken agent beat text but only at moderate use, and
 * reversed at heavy use; a 2026 npj Digital Medicine paper models how
 * general-purpose chatbots perpetuate anxiety by becoming the thing you seek
 * reassurance from. An exchange that ends is the design, not a limitation of
 * it. Change this one constant if that call goes the other way.
 */
export const MAX_TURNS = 3;

// Concreteness is the active ingredient. Abstract, evaluative self-focus
// ("why am I like this") is the harmful mode of rumination; concrete,
// process-focused attention ("what happened, in what order") is the useful
// one. Watkins' concreteness training beat both a waiting list and a bogus
// control on depressive symptoms. So the model may write the question, but it
// does not get the final say: anything abstract is thrown away.
export const CONCRETE_QUESTIONS = [
  "What happened in the minute before?",
  "Where were you when it started?",
  "What was the first sign?",
  "Who else was there?",
  "What time of day was it?",
  "What did you do immediately after?",
  "What would you have to see for this to be over?",
  "What is the smallest part of this that is actually true?",
  "When did you last notice it not happening?",
  "What were your hands doing?",
  "What was the last thing said out loud?",
  "Which part of it happened first?",
];

// Second and third questions sit on an answer, so they can be more specific
// than an opener and should not repeat the opener's shape.
export const FOLLOWUP_QUESTIONS = [
  "And what happened after that?",
  "What was different about the times it did not happen?",
  "Which part of that did you actually see, and which part did you fill in?",
  "What was the very next thing you did?",
  "How long did it last, in minutes?",
  "What would someone watching have seen?",
  "What is the first thing you would notice if this had passed?",
  "Which detail of it do you keep returning to?",
];

// Openings that mark the abstract mode, whatever follows them.
export const BANNED_OPENINGS = [
  "why", "what does that say", "what does this say", "what do you think it means",
  "how do you feel about", "what does it mean", "how does that make you feel",
];

/**
 * Reassurance, comfort, praise and advice. Every one of these is a sentence a
 * warm, helpful assistant produces by default, and every one of them is a
 * safety behaviour: reassurance relieves anxiety for minutes and maintains it
 * for months. An instrument that cannot be leaned on cannot become the thing
 * somebody leans on.
 *
 * Patterns, not phrases. The first version of this was a list of literal
 * strings and a test walked straight through it with "it's going to be okay"
 * — which contains neither "it's okay" nor "will be okay". Enumerating
 * phrasings is whack-a-mole; the families are small and stable.
 *
 * Deliberately biased toward over-rejection. A false positive costs one
 * curated line instead of the model's; a false negative ships reassurance to
 * somebody at 3am. Those are not the same mistake.
 */
export const BANNED_IN_LINE: RegExp[] = [
  // "it / everything / you ... will be fine" in any arrangement.
  /\b(it|its|itll|it will|that|this|everything|things|you|youll|you will|youre|you are)\b[^.?!]{0,24}\b(ok|okay|fine|alright|all right|better|normal|valid)\b/,
  // Company and presence.
  /\bnot alone\b/, /\b(i am|im) (here|with you)\b/, /\bi understand\b/,
  // Sympathy.
  /\bmust be\b[^.?!]{0,14}\b(hard|difficult|tough|painful|awful|exhausting|frustrating|scary|overwhelming|a lot)\b/,
  /\bsounds (like|hard|tough|difficult|exhausting)\b/,
  /\b(dont|do not|no need to) worry\b/,
  // Technique and advice.
  /\btake a (deep )?breath\b/, /\bbreathe\b/,
  /\byou (should|need to|have to|must|could try|might try|may want)\b/,
  /\btry (to|and)\b/, /\bi (suggest|recommend|would)\b/, /\bwhat helps\b/,
  /\b(be kind to|give|allow) yourself\b/, /\bremember (that )?you\b/,
  /\byou(ve| have) got this\b/,
  // Praise and thanks.
  /\b(proud of you|well done|good job|thank you|thanks for|brave|courageous)\b/,
  /\bgood (that|for) you\b/,
  // Promises about the future.
  /\b(will|wont|will not) (pass|last|matter|hurt|change|go away)\b/,
  /\bin time\b/, /\beventually\b/, /\bone day\b/,
];

/** Apostrophes folded, so "it's", "its" and "it is" all meet one pattern. */
const normalise = (s: string) =>
  s.toLowerCase().replace(/[‘’']/g, "").replace(/\s+/g, " ");

/**
 * Lines that close or carry the exchange without comforting. Deliberately
 * observational: they note what was added, they do not evaluate it. Used
 * whenever the model's own line fails the guard, which must never leave the
 * exchange silent.
 */
export const NEUTRAL_LINES = [
  "That is one more thing the thought did not include.",
  "A detail, where before there was a conclusion.",
  "Then the account has an order to it now.",
  "That part is observable. Much of the rest was not.",
  "Something happened, and something came after it.",
  "The thought is a shorter thing than it was.",
];

export const CLOSING_LINES = [
  "That is enough for one night. It is written down, and it is out there.",
  "The thought has somewhere to be now. You can leave it.",
  "It is placed. Nothing more is needed from you tonight.",
  "That is where this stops. The star keeps it.",
];

const tidy = (raw: unknown): string =>
  typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";

/**
 * A question Aether is allowed to ask: one sentence, actually a question,
 * short enough to read in a glance, and concrete. Anything else is replaced
 * with a curated one chosen deterministically, so a given thought always
 * falls back to the same question rather than a different one each reload.
 */
export function cleanQuestion(raw: unknown, seed: string, pool = CONCRETE_QUESTIONS): string {
  const fallback = pool[hashString("q" + seed) % pool.length];
  const q = tidy(raw);
  if (q.length < 8 || q.length > 90) return fallback;
  if (!q.endsWith("?")) return fallback;
  if ((q.match(/\?/g) ?? []).length > 1) return fallback;
  const low = q.toLowerCase();
  if (BANNED_OPENINGS.some(b => low.startsWith(b) || low.includes(" " + b))) return fallback;
  return q;
}

/**
 * A line Aether is allowed to say back. Not a question — the question is a
 * separate field, and a line that ends in one turns the exchange into two
 * questions at once. Not reassurance, not advice, not praise.
 */
export function cleanLine(raw: unknown, seed: string, pool = NEUTRAL_LINES): string {
  const fallback = pool[hashString("l" + seed) % pool.length];
  const line = tidy(raw);
  if (line.length < 10 || line.length > 200) return fallback;
  if (line.includes("?")) return fallback;
  const norm = normalise(line);
  if (BANNED_IN_LINE.some(re => re.test(norm))) return fallback;
  // A model that starts listing has stopped talking and started advising.
  if (/^\s*[-*\d]\s/.test(line) || line.includes(" 1. ") || line.includes(" 2. ")) return fallback;
  return line;
}

export type Turn = { q: string; a: string };

/**
 * Read the transcript off a request body. Caps everything: the count, because
 * the exchange is bounded; the lengths, because this is pasted into a prompt
 * and a person's own words are the one thing in it an attacker controls.
 */
export function readTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_TURNS)
    .map((t: any) => ({ q: tidy(t?.q).slice(0, 160), a: tidy(t?.a).slice(0, 400) }))
    .filter(t => t.q && t.a);
}

/** Whether another question may be asked, given what has already been asked. */
export function mayAskAgain(turns: Turn[]): boolean {
  return turns.length > 0 && turns.length < MAX_TURNS;
}

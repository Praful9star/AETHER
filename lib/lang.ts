// Aether in the language people actually think in.
//
// The people this was built for do not overthink in English. They do it in
// Hindi, or in Hinglish — Hindi written in Latin letters with English mixed
// through it — and an app that only hears English asks them to translate a
// worry before they are allowed to put it down. Translating is the opposite
// of putting it down.
//
// Three things have to follow the language, and the third is the one that
// matters: what is heard, what is said back, and WHAT IS REFUSED. Every guard
// in lib/exchange.ts was English. A model answering in Hindi could say
// "sab theek ho jayega" — everything will be fine — or ask "kyun?" straight
// through a filter that only knew the English for them. A guard that works in
// one language is a guard with a door in it, so the Hindi and Hinglish
// equivalents live here and are applied to every line in every language.

export type Lang = "en" | "hinglish" | "hi";

const DEVANAGARI = /[ऀ-ॿ]/;

// Words that are Hindi and not also ordinary English. "main", "to", "the",
// "is", "are" and "par" are deliberately absent: each is a common English
// word, and one of them in an English sentence must not flip the language.
const HINGLISH_MARKERS = new Set([
  "hai","hain","nahi","nahin","kya","kyun","kyon","mujhe","mera","meri","mere",
  "raha","rahi","rahe","hoon","hun","tha","thi","bahut","yaar","kal","aaj",
  "hoga","hogi","karna","karta","karti","lagta","lagti","kuch","phir","abhi",
  "kaise","kaisa","mein","aur","lekin","agar","toh","bhi","sab","woh","yeh",
  "accha","acha","theek","pata","dar","soch","sochta","sochti","hota","hoti",
  "gaya","gayi","diya","liya","wala","wali","unhone","usne","maine","humne",
]);

/**
 * Which language a thought is written in.
 *
 * Any Devanagari makes it Hindi. Otherwise it is Hinglish only when at least
 * two different marker words appear and they are a real share of the
 * sentence — one borrowed "yaar" in an English sentence is still English.
 */
export function detectLang(text: string): Lang {
  if (!text) return "en";
  if (DEVANAGARI.test(text)) return "hi";
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!words.length) return "en";
  const hits = new Set<string>();
  let n = 0;
  for (const w of words) if (HINGLISH_MARKERS.has(w)) { hits.add(w); n++; }
  return hits.size >= 2 && n / words.length >= 0.2 ? "hinglish" : "en";
}

// ── What is refused, in Hindi and Hinglish ──────────────────────────────────
//
// The same families as BANNED_IN_LINE: "why", reassurance, advice, praise and
// false futurity. Tested against a lower-cased line. Biased toward rejecting
// too much, like the English ones — a wrongly rejected line costs a curated
// fallback, and a wrongly accepted one tells somebody everything will be fine.
// Devanagari patterns carry no \b, because JavaScript's word boundary does
// not understand the script.

export const HI_WHY: RegExp[] = [/\b(kyun|kyon|kyu|kyo|kyoon)\b/, /क्यों|क्यूँ|क्यूं|क्यु|क्यो/];

export const HI_BANNED_IN_LINE: RegExp[] = [
  ...HI_WHY,
  // everything / it will be fine
  /\b(sab|sabkuch)\b.{0,24}\b(theek|thik|accha|acha|sahi|badhiya)\b/,
  /\b(theek|thik|accha|acha|behtar)\b.{0,10}\bho\b.{0,6}\b(jayega|jaega|jaayega|jayegi|jaegi|jaayegi|jayenge)\b/,
  /सब.{0,16}(ठीक|अच्छा|सही)/, /(ठीक|अच्छा|बेहतर) हो (जाएगा|जायेगा|जाएगी|जायेगी|जाएंगे)/,
  // do not worry
  /\b(chinta|fikar|fikr|tension|pareshan|ghabra\w*)\b.{0,14}\b(mat|na|nahi|nahin)\b/, /\bmat ghabra/,
  /(चिंता|फ़िक्र|फिक्र|टेंशन|परेशान).{0,10}(मत|न करो|ना करो)/, /घबरा/,
  // you are not alone / I understand / I am here
  /\b(akele|akela|akeli)\b.{0,10}\b(nahi|nahin)\b/, /अकेल.{0,8}नहीं/,
  /\bsamajh\b.{0,10}\b(sakta|sakti|raha|rahi)\b/, /समझ (सकता|सकती|रहा|रही)/,
  /\b(main|mai|mein) (yahan|yahaan|saath|sath)\b/, /मैं (यहाँ|यहां|साथ)/,
  // advice
  /\b(chahiye|chaiye|chahie)\b/, /\bkoshish\b/, /\b(karo|kijiye|kariye|kar lo|karke dekho|try karo)\b/,
  /चाहिए/, /कोशिश/, /करो|कीजिए|करिए/,
  /\b(saans|sans)\b.{0,8}\b(lo|lijiye)\b/, /सांस.{0,6}(लो|लीजिए)/,
  // praise
  /\b(shabash|shabaash|bahadur|garv|himmat)\b/, /शाबाश|बहादुर|गर्व|हिम्मत/,
  // it will pass
  /\b(guzar|beet|nikal)\b.{0,10}\b(jayega|jaega|jaayega)\b/, /\bwaqt ke saath\b/, /\bek din\b/,
  /(बीत|गुज़र|गुजर|निकल).{0,6}(जाएगा|जायेगा)/, /वक़्त के साथ|वक्त के साथ|समय के साथ/, /एक दिन/,
];

export function bannedInAnyLanguage(lowered: string): boolean {
  return HI_BANNED_IN_LINE.some((re) => re.test(lowered));
}

// ── Curated lines, per language ─────────────────────────────────────────────
// The fallbacks are where the product's voice is most its own, so they are
// written, not translated: each asks about the world, never about the self,
// and none of them is "why".

export const QUESTIONS: Record<Lang, string[]> = {
  en: [],   // English uses the pools in lib/exchange.ts
  hinglish: [
    "Uske theek pehle kya hua tha?",
    "Jab ye shuru hua tab tum kahan the?",
    "Sabse pehle kya notice hua?",
    "Wahan aur kaun tha?",
    "Uske turant baad tumne kya kiya?",
    "Aakhri baar zor se kya bola gaya tha?",
    "Ye aakhri baar kab nahi ho raha tha?",
    "Kya dikhega jab ye khatam ho chuka hoga?",
  ],
  hi: [
    "उसके ठीक पहले क्या हुआ था?",
    "जब यह शुरू हुआ तब आप कहाँ थे?",
    "सबसे पहले क्या दिखा?",
    "वहाँ और कौन था?",
    "उसके तुरंत बाद आपने क्या किया?",
    "आख़िरी बार ज़ोर से क्या कहा गया था?",
    "यह आख़िरी बार कब नहीं हो रहा था?",
    "क्या दिखेगा जब यह ख़त्म हो चुका होगा?",
  ],
};

export const NEUTRAL: Record<Lang, string[]> = {
  en: [],
  hinglish: ["Ye baat ab likhi ja chuki hai.", "Jo tumne kaha, wo ab star ke paas hai.", "Itna ab tumhare bahar rakha hai."],
  hi: ["यह बात अब लिखी जा चुकी है।", "जो आपने कहा, वह अब तारे के पास है।", "इतना अब आपके बाहर रखा है।"],
};

export const CLOSING: Record<Lang, string[]> = {
  en: [],
  hinglish: ["Ye sab ab star ke paas hai. Baat yahin rukti hai.", "Jo kaha gaya, rakh liya gaya. Aaj ke liye itna."],
  hi: ["यह सब अब तारे के पास है। बात यहीं रुकती है।", "जो कहा गया, रख लिया गया। आज के लिए इतना।"],
};

export const FIRST_LINE: Record<Lang, string[]> = {
  en: [],
  hinglish: ["Ek thought bhi andhere ko roshni mein mod deta hai.", "Jo tumne kaha, uska ab ek aakar hai.", "Khamoshi bas tumhare kuch kehne ka intezaar kar rahi thi."],
  hi: ["एक विचार भी अँधेरे को रोशनी में मोड़ देता है।", "जो आपने कहा, उसका अब एक आकार है।", "ख़ामोशी बस आपके कुछ कहने का इंतज़ार कर रही थी।"],
};

// ── When the same thought comes back ────────────────────────────────────────
//
// Asking a returning thought the question it was asked the first time is how
// a loop gets rehearsed. These ask the only thing that is new about a return:
// what is different, and what was happening when it arrived.

export const LOOP_QUESTIONS: Record<Lang, string[]> = {
  en: [
    "What is different about it this time?",
    "What was happening just before it came back?",
    "Where were you when it came back?",
    "Which part of it is new since last time?",
    "What has happened in the world since you last wrote this?",
  ],
  hinglish: [
    "Is baar isme kya alag hai?",
    "Iske wapas aane se theek pehle kya ho raha tha?",
    "Jab ye wapas aaya tab tum kahan the?",
    "Pichhli baar se isme naya kya hai?",
    "Jab se ye pichhli baar likha, tab se bahar kya badla hai?",
  ],
  hi: [
    "इस बार इसमें क्या अलग है?",
    "इसके वापस आने से ठीक पहले क्या हो रहा था?",
    "जब यह वापस आया तब आप कहाँ थे?",
    "पिछली बार से इसमें नया क्या है?",
    "जब से यह पिछली बार लिखा, तब से बाहर क्या बदला है?",
  ],
};

function pick(pool: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

/** The question for a thought that has come back, in its own language. */
export function loopQuestion(text: string, visit: number): string {
  // The visit number is part of the seed, so the third return is not asked
  // what the second one was.
  return pick(LOOP_QUESTIONS[detectLang(text)], text.toLowerCase().trim() + "#" + visit);
}

/** A curated pool in the thought's language, or `english` when it is English. */
export function poolFor(table: Record<Lang, string[]>, text: string, english: string[]): string[] {
  const l = detectLang(text);
  return l === "en" || !table[l].length ? english : table[l];
}

/** Appended to every system prompt. */
export const LANGUAGE_RULE = `

LANGUAGE. Write in the language and script the person wrote in.
- English thought: English.
- Hindi in Devanagari: Hindi in Devanagari.
- Hinglish (Hindi written in Latin letters, often mixed with English): Hinglish in Latin letters, the way they wrote it.
Every rule above holds in every language. Never ask "kyun" or "क्यों". Never say everything will be fine ("sab theek ho jayega"), never tell them not to worry ("chinta mat karo"), never give advice ("...karna chahiye", "koshish karo"), never praise.`;

// ── Leaving a thought with its star until later ─────────────────────────────
//
// Worry postponement: a returning thought is not argued with and not obeyed,
// it is given an appointment. The star holds it until then. The person
// chooses the time — Aether never suggests they should, which would be advice.

export type ParkOption = { key: string; label: string; until: number };

export function parkOptions(now: number): ParkOption[] {
  const d = new Date(now);
  const at = (addDays: number, hour: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays, hour, 0, 0, 0).getTime();
  const out: ParkOption[] = [];
  // "This evening" only while there is an evening left to leave it until.
  if (d.getHours() < 17) out.push({ key: "evening", label: "this evening", until: at(0, 19) });
  out.push({ key: "tomorrow", label: "tomorrow morning", until: at(1, 9) });
  // Next Saturday; if today is Saturday, the one after.
  const toSat = ((6 - d.getDay() + 7) % 7) || 7;
  out.push({ key: "weekend", label: "the weekend", until: at(toSat, 10) });
  return out;
}

/** "tomorrow, 9:00 am" / "Sat 14 Nov, 10:00 am" — for the note on screen. */
export function parkedLabel(until: number, now: number): string {
  const u = new Date(until), n = new Date(now);
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(u) - day0(n)) / 86400000);
  const h = u.getHours(), m = u.getMinutes();
  const time = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  const day =
    diff === 0 ? "today" : diff === 1 ? "tomorrow"
    : `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][u.getDay()]} ${u.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][u.getMonth()]}`;
  return `${day}, ${time}`;
}

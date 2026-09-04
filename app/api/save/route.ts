import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Same 34-form taxonomy as app/api/whisper/route.ts. Duplicated rather than
// imported (matching that file's own convention) since this route needs it
// only as a validation whitelist, not for any generation logic.
const FORMS = [
  "spiral", "barred", "elliptical", "ring", "merger",
  "quasar", "supernova", "filament", "hourglass", "tidal",
  "irregular", "lenticular", "sphere", "nebula", "vortex",
  "polar_ring", "cartwheel", "starburst", "jellyfish", "shell",
  "accretion", "pulsar", "void", "magnetar", "einstein",
  "relic", "lorenz", "cymatics", "plasma", "protostar",
  "phyllotaxis", "mobius", "trefoil", "dendrite",
];
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const DEFAULT_PALETTE = ["#050318", "#2d1b69", "#b892ff"];

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ ok: false, reason: "no-supabase" });
  }

  try {
    const body = await req.json();
    const { thought, whisper, palette, form, energy, user_id, pos } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // This is an unauthenticated public endpoint — the normal caller is our
    // own UI sending well-formed AI-generated data, but nothing stops a
    // direct POST with arbitrary content. Everything that ends up rendered
    // elsewhere (the /w/[id] share page, the OG image generator) needs a
    // bound here, not trust in the caller.
    const validPalette = Array.isArray(palette) && palette.length === 3 && palette.every((c: unknown) => typeof c === "string" && HEX.test(c))
      ? palette
      : DEFAULT_PALETTE;
    const validForm = FORMS.includes(String(form)) ? String(form) : "spiral";
    const validEnergy = Number.isFinite(Number(energy)) ? Math.max(0, Math.min(1, Number(energy))) : 0.5;

    const { data, error } = await supabase
      .from("whispers")
      .insert({
        id: uuidv4(),
        user_id: String(user_id ?? "anon").slice(0, 64),
        thought: String(thought ?? "").slice(0, 500),
        whisper: String(whisper ?? "").slice(0, 300),
        palette: validPalette,
        form: validForm,
        energy: validEnergy,
        pos: pos ?? null,
        // Private by default — a whisper is only reachable by its own
        // unguessable id (the /w/[id] share link), never via a public feed.
        public: false,
      })
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    return Response.json({ ok: false, reason: String(err) });
  }
}

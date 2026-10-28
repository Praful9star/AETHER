"use client";

// Two fields, in sequence: an address, then the six digits sent to it.
//
// This is the only screen in Aether that asks for anything, so it is written
// to stay out of the way — it says what signing in is FOR (your sky follows
// you) rather than what it is, it never calls itself an account, and it can
// be dismissed at any point without losing the galaxy behind it.
//
// Everything that could go wrong here is told to the person in a sentence
// they can act on. The one failure that is not theirs to fix is the email
// template not carrying {{ .Token }} — see lib/auth.ts — and the only honest
// signal we have for it is that the mail arrived with a link and no code, so
// the "no code in the email?" line is there to catch exactly that.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cleanCode, sendCode, signOut, validCode, validEmail, verifyCode, type Auth } from "@/lib/auth";

export default function SignIn({
  accent,
  auth,
  onClose,
  onSignedIn,
  onSignedOut,
}: {
  accent: string;
  auth: Auth | null;
  onClose: () => void;
  onSignedIn: (a: Auth) => void;
  onSignedOut: () => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  // Focus follows the step, so a person who has just read "we sent a code"
  // can type it without reaching for the field.
  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const a40 = accent + "40";
  const a66 = accent + "aa";

  const field: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,.04)",
    border: `1px solid ${a40}`,
    borderRadius: 12,
    padding: "11px 14px",
    color: "#ece8ff",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };
  const button: React.CSSProperties = {
    width: "100%",
    background: `linear-gradient(135deg,${accent}44,${accent}22)`,
    border: `1px solid ${a66}`,
    borderRadius: 999,
    padding: "11px 14px",
    color: "#ece8ff",
    fontSize: 10,
    letterSpacing: "0.18em",
    cursor: "pointer",
    fontFamily: "inherit",
  };
  const quiet: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "rgba(200,196,235,.55)",
    fontSize: 10.5,
    letterSpacing: "0.08em",
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "6px 2px",
    textDecoration: "underline",
    textUnderlineOffset: 3,
  };

  async function submitEmail() {
    if (busy) return;
    setErr("");
    if (!validEmail(email)) { setErr("That does not look like an email address."); return; }
    setBusy(true);
    const r = await sendCode(email);
    setBusy(false);
    if (!r.ok) { setErr(r.reason || "Could not send the code."); return; }
    setStep("code");
  }

  async function submitCode() {
    if (busy) return;
    setErr("");
    if (!validCode(code)) { setErr("The code is six digits."); return; }
    setBusy(true);
    const r = await verifyCode(email, code);
    setBusy(false);
    if (!r.ok || !r.auth) { setErr(r.reason || "That code did not match."); return; }
    onSignedIn(r.auth);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60, background: "rgba(4,2,10,.86)",
        backdropFilter: "blur(10px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380, background: "rgba(9,6,18,.98)",
          border: `1px solid ${a40}`, borderRadius: 18, padding: 22,
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
        }}
      >
        {auth ? (
          <>
            <div style={{ fontSize: 9.5, letterSpacing: "0.26em", color: a66, textTransform: "uppercase" }}>
              your sky
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(226,222,250,.9)", lineHeight: 1.55 }}>
              Signed in as {auth.email || "you"}. Your stars are kept with your account, so
              they follow you to any device you sign in on.
            </div>
            <button style={button} onClick={async () => { await signOut(); onSignedOut(); }}>
              SIGN OUT
            </button>
            {/* Said plainly, because it is the question somebody signing out
                actually has, and the answer is not obvious: the sky in this
                browser stays where it is. */}
            <div style={{ fontSize: 11, color: "rgba(200,196,235,.45)", lineHeight: 1.5 }}>
              Signing out leaves the stars in this browser untouched. It only stops new
              ones being kept with your account.
            </div>
            <button style={quiet} onClick={onClose}>close</button>
          </>
        ) : step === "email" ? (
          <>
            <div style={{ fontSize: 9.5, letterSpacing: "0.26em", color: a66, textTransform: "uppercase" }}>
              keep your sky
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(226,222,250,.9)", lineHeight: 1.55 }}>
              Your stars live in this browser. Add an email and they follow you — to your
              phone, to a new laptop, through clearing your history.
            </div>
            <input
              style={field}
              type="email" inputMode="email" autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void submitEmail(); }}
              aria-label="your email address"
            />
            <button style={button} onClick={() => void submitEmail()} disabled={busy}>
              {busy ? "SENDING…" : "SEND ME A CODE"}
            </button>
            {err && <div style={{ fontSize: 11.5, color: "#ffb4b4" }}>{err}</div>}
            {/* No password, so this is worth stating rather than leaving
                people to wonder what they are signing up for. */}
            <div style={{ fontSize: 11, color: "rgba(200,196,235,.45)", lineHeight: 1.5 }}>
              No password. We use the address to send a code and to find your sky again,
              nothing else.
            </div>
            <button style={quiet} onClick={onClose}>not now</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9.5, letterSpacing: "0.26em", color: a66, textTransform: "uppercase" }}>
              six digits
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(226,222,250,.9)", lineHeight: 1.55 }}>
              Sent to {email}. It may take a moment.
            </div>
            <input
              ref={codeRef}
              style={{ ...field, letterSpacing: "0.5em", textAlign: "center", fontSize: 19 }}
              inputMode="numeric" autoComplete="one-time-code"
              placeholder="······"
              value={code}
              // Cleaned on the way in, so a pasted "123 456" works and a
              // stray letter cannot sit in the field looking valid.
              onChange={(e) => { setCode(cleanCode(e.target.value)); setErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void submitCode(); }}
              aria-label="the six digit code from your email"
            />
            <button style={button} onClick={() => void submitCode()} disabled={busy}>
              {busy ? "CHECKING…" : "ENTER MY SKY"}
            </button>
            {err && <div style={{ fontSize: 11.5, color: "#ffb4b4" }}>{err}</div>}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button style={quiet} onClick={() => { setStep("email"); setCode(""); setErr(""); }}>
                use a different address
              </button>
              <button style={quiet} onClick={() => void submitEmail()} disabled={busy}>
                send another
              </button>
            </div>
            {/* The one failure that is ours, not theirs. If the Supabase email
                template was never given {{ .Token }} the mail arrives with a
                working link and no digits, and without this line the person
                is left staring at a field for a code that does not exist. */}
            <div style={{ fontSize: 11, color: "rgba(200,196,235,.45)", lineHeight: 1.5 }}>
              No code in the email, only a link? Click the link — it signs you in too.
            </div>
            <button style={quiet} onClick={onClose}>close</button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

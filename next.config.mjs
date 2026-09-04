/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["three"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops the browser guessing content types on responses that
          // don't declare one — a defense against a class of XSS.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing in this app needs to be framed by another site; this
          // is the standard clickjacking mitigation.
          { key: "X-Frame-Options", value: "DENY" },
          // Sends the full referrer on same-origin navigation (fine — this
          // app has no sensitive path structure) but only the origin, not
          // the full URL/query, cross-origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
    // Deliberately not adding a Content-Security-Policy or Permissions-Policy
    // here: a real CSP needs a nonce threaded through every script tag (this
    // app already loads next/font, calls out to Groq and Supabase, and uses
    // SpeechRecognition for voice input) and getting that wrong risks
    // breaking the app outright — not a change to make without being able
    // to verify it end-to-end against the real deployed origin.
  },
};

export default nextConfig;

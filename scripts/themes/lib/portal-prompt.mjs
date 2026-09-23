/**
 * The switcher's first-load prompt, for the scripts that film or time the
 * portal (motion.mjs, capture.mjs, trace-arrival.mjs). A fresh browser
 * context shows it, so each of them marks it dismissed before any page
 * script runs; otherwise its fade-in, its beacon and its disappearance on
 * the first click land in every strip and every timing.
 *
 * The key is switcher.ts's PROMPT_KEY. tests/portal-prompt-key.test.ts keeps
 * the two in step, so renaming it there cannot silently bring the prompt
 * back into all three scripts' output.
 */
export const PROMPT_KEY = 'bdl-portal-prompt';

/** Mark the prompt dismissed for every page the context opens. */
export async function suppressPrompt(context) {
  await context.addInitScript((key) => {
    try { sessionStorage.setItem(key, 'dismissed'); } catch {}
  }, PROMPT_KEY);
}

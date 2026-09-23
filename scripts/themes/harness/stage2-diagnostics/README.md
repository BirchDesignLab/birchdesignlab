# Stage 2 diagnostics (archived)

Ad hoc probes that Tier 3 Stage 2 workflow agents wrote in a session
scratchpad on 09-23-26, moved here unchanged under the repo rule that scripts
are kept. Each was a one-off question, since answered by a real tool:

| file | question it answered | superseded by |
|---|---|---|
| `probe.mjs`, `probe2.mjs` | Do the wordmark images follow the group's timing? (P5) | `lib/wordmark-sampler.mjs` + `motion.mjs --crop wordmark` |
| `lum.mjs`, `lum2.mjs` | How near-white is each frame of a strip? (vaporwave light CRT) | the strips and the follow-up's reported percentages |
| `sum.cjs` | Tally a label folder's wordmark verdicts | `rejudge-wordmark.mjs` |

Paths inside may point at the author's machine or a scratchpad; read them as
a record, and fix the paths before running one again. The two probes worth
keeping as tools are one folder up: `aa-probe.mjs` and `lock-race.mjs`.

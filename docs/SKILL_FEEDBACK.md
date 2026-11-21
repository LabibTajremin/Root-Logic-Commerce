# automatic-agentic-run — feedback from the Root Logic Commerce build

What changed in `.claude/skills/automatic-agentic-run/SKILL.md` and why (copy it into the version saved in your Claude account):

1. **§2 gate recipe** — added the proven `verify` order and the rule that the coverage gate must print the exact
   uncovered lines/branches/functions on failure. Without it, CI failures needed a local re-run to diagnose.
2. **New §5 "Pitfalls already paid for"** — eight repo-agnostic lessons that cost real fix rounds here:
   - coverage build setup, and measuring each file in the layer that runs it (merging bundles misaligned ranges);
   - browser coverage lost on full page loads; per-script URL merging; modules duplicated across chunks;
   - framework route bundles duplicating singletons (two PGlite instances) and breaking `instanceof`;
   - e2e flakes with real causes: hydration races, React form resets, late `<title>`, keyboard DnD, ambiguous "Saved";
   - store-wide settings tests isolated in a last, serial project; third-party hosts stubbed;
   - CI slower than local (races appear only there), cancelled superseded runs;
   - running the long gate in the background without touching the tree it enumerates;
   - noisy measurements (Lighthouse): median of 3 after warm-up, bar unchanged.
3. Sections renumbered (BLOCKED 6, Finish 7, Token economy 8, Auto-resume 9). §2's quality bar is unchanged.
4. `autopilot.sh` in the skill folder was already identical to `scripts/autopilot.sh` — no change.

The PR-based flow (§4, one work branch + one PR, never push to `main`) was introduced at the owner's request
during this run and proved workable: 50+ commits stacked on one PR with a section per phase in its body.

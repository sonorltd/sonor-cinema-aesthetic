# Sonor render workspaces — FOLDER LAW (2026-08-26)

One folder per PROJECT NUMBER, one subfolder per RENDER REVISION:
  renders/<project-number>/site-photos/   originals (downscaled ~1280px working copies)
  renders/<project-number>/nano-banana-prompts-rN.md   prompts per revision
  renders/<project-number>/rN/            that revision's output — never overwrite an old rN, start r(N+1)

Batch runner: greystones/nano-banana-batch.mjs (key in greystones/.env, git-ignored).
Run: node ../../greystones/nano-banana-batch.mjs --file nano-banana-prompts-rN.md \
     --styleref site-photos/<best>.jpg --photos site-photos --out rN

Older ad-hoc workspaces ('15 harrop' = 1387 concept phase, 'greystones' = 1392) predate this law and stay as-is.

# Phase 5 recon — idle claims (2026-10-07)

Single wave, done inline: the seam was obvious from Stage B.

## Seam
- `skills/spec/tools/board/attention.ts:13-17` `needsYou` spreads one builder per kind; mirror
  `oldRemoteClaims` (`:43-48`): `shown` = `inFlight.map(rowKey)`, filter `inputs.claims`.
- `inputs.sessions` is `Result<LiveSession[]> | "local"` (`board/inputs.ts:41`); `--local` → `"local"`
  (`board/load.ts:50`). Both "local" and `ok: false` → no idle rows.
- `HeldClaim.status === "live"` already means the claim's `sessionId` is in the session list
  (`claims/rules.ts:35-41`); join by `sessionId` to read `status`, `updatedAt`, `updatedFrom`, `name`.
- `LiveSession.updatedFrom` (`sessions/live.ts:24`) is phase 3's `startedAt` flag.
- `olderThanDays` in `core/age.ts`; `ago` and `rowName` in `board/cells.ts:25,42`.
- Model union `board/model.ts:69-77`; render `attentionCells` `board/render.ts:88-96`.
- Session label: `sessionLabel(name, sessionId)` in `sessions/label.ts` (tab title, else short id).

## Reuse
- No new helper: `olderThanDays`, `sessionLabel`, `rowKey`, `ago`, `rowName` cover it.

## Testing issues
- None. Factories exist: `liveSession`, `heldClaim` (`tests/factories.ts:70-80`), `boardInputs`,
  `NOW` (`tests/board-factories.ts`). `board-claims.test.ts` `boardWith` builds a full board.
- File sizes: attention.ts 71, render.ts 112, model.ts 152 lines; all stay well under 250.

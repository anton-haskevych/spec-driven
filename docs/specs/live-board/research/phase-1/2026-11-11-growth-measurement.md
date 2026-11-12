# Phase 1 — record growth measurement

Script: `growth-measure.ts` beside this note (run from the repo root). A bare origin and a clone in a temp dir;
3,001 documents (40 specs × 9 documents, 2,000 cards, 600 sources, 40 tags, `meta.json`); 1,000 writes through
`writeRecord` and `gitRecordPort`, 60% to phase documents and 40% to cards. Each layout was run once.
Load average was 18–28 at the start and 344 at the end (other sessions), so seconds are an upper bound:
each git spawn cost 30–50 ms instead of the usual 5–10 ms.

## Results

| | Cards in one folder | Cards in folders of 100 |
|---|---|---|
| Seconds per write (mean · p50 · p95) | 0.53 · 0.49 · 0.80 | 0.62 · 0.55 · 1.17 |
| `cards/` tree object | 74,893 B | 599 B (largest folder 3,555 B) |
| Origin, seeded (packed) | 336 KiB | 338 KiB |
| Origin after 1,000 writes, before gc (loose + pack) | 3,080 + 1,209 KiB | 1,672 + 1,089 KiB |
| Origin after gc | 1,012 KiB | 995 KiB |
| Cold fetch of the record (one ref, after gc) | 0.16 s | 0.17 s |

One ref per document instead (3,000 refs, `fast-import`): first fetch of all refs 4.2 s, a later fetch 0.34 s,
`ls-remote` of everything 0.19 s, fetching only `main` with them present 0.36 s.

## What it says

- **Growth is small.** About 0.7 KiB per write once packed: 1,000 writes took a 3,000-document record from
  336 KiB to about 1 MiB. Git's own gc keeps it there; nothing needs pruning.
- **Write time doesn't depend on folder size at 2,000 cards.** The difference between the two runs is load
  noise. A save is about a dozen git spawns plus a fetch and a push (profiled: fetch 100–180 ms, push
  170–240 ms here).
- **A flat folder costs bytes on every write.** Each card change rewrites and pushes the whole `cards/` tree:
  75 KB at 2,000 cards, growing with every card (375 KB at 10,000). Loose objects before gc were 1.8× larger.
  Folders of 100 keep each rewrite to about 3.5 KB however many cards there are.
- **One ref per document is the wrong shape**, as the design said: a fresh machine needs 4.2 s to fetch 3,000
  refs against 0.16 s for the one record ref, and a batch can't be atomic across refs.

## Shard rule for `cards/`

`cards/<floor(n / 100)>/c<n>.json`: card `c1234` lives at `cards/12/c1234.json`. At most 100 cards per folder,
well under the 500 cap, and a card's path follows from its id alone. Phase 8 builds cards on this rule.

## Raw output

```json
{
  "at": "2026-11-12T04:09:48.826Z",
  "git": "git version 2.54.0 (Apple Git-157)",
  "flat": {
    "shard": "flat",
    "documents": 3001,
    "writes": 1000,
    "secondsPerWrite": {
      "mean": 0.527,
      "p50": 0.488,
      "p95": 0.798
    },
    "treeBytes": {
      "root": 166,
      "cards": 74893,
      "largestCardFolder": 74893
    },
    "originKiB": {
      "seeded": {
        "looseKiB": 0,
        "packKiB": 336,
        "objects": 3687
      },
      "afterWritesBeforeGc": {
        "looseKiB": 3080,
        "packKiB": 1209,
        "objects": 8887
      },
      "afterGc": {
        "looseKiB": 0,
        "packKiB": 1012,
        "objects": 8887
      }
    },
    "coldFetchSeconds": 0.159
  },
  "sharded": {
    "shard": "by-100",
    "documents": 3001,
    "writes": 1000,
    "secondsPerWrite": {
      "mean": 0.622,
      "p50": 0.548,
      "p95": 1.174
    },
    "treeBytes": {
      "root": 166,
      "cards": 599,
      "largestCardFolder": 3555
    },
    "originKiB": {
      "seeded": {
        "looseKiB": 0,
        "packKiB": 338,
        "objects": 3708
      },
      "afterWritesBeforeGc": {
        "looseKiB": 1672,
        "packKiB": 1089,
        "objects": 9308
      },
      "afterGc": {
        "looseKiB": 0,
        "packKiB": 995,
        "objects": 9308
      }
    },
    "coldFetchSeconds": 0.166
  },
  "separateRefs": {
    "refs": 3000,
    "fetchAllRefsColdSeconds": 4.223,
    "fetchAllRefsWarmSeconds": 0.342,
    "lsRemoteAllSeconds": 0.19,
    "fetchMainOnlySeconds": 0.361
  }
}
```

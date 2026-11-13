// Colour, one meaning each: orange / blue / green = to do / moving / done; red = trouble; yellow = waits on you;
// a hue per person; ink weight = priority. Light by default, dark by the system or data-theme="dark".
export const TOKENS = `
:root {
  --bg: #f4f2f9; --surface: #ffffff; --sunk: #ebe8f3; --ink: #1c1830; --muted: #5d5672; --faint: #8a849e; --line: #d9d4e6; --soft: #ece9f4;
  --todo: #ee7d11; --todo-ink: #9c4a00; --todo-bg: #ffefdc;
  --move: #2877e6; --move-ink: #1a5bc0; --move-bg: #e2edff;
  --done: #1e9c56; --done-ink: #127040; --done-bg: #dcf5e6;
  --late: #d42c20; --late-ink: #b32318; --late-bg: #fde7e4; --on-late: #ffffff;
  --you: #ffd02e; --you-ink: #2a2000; --you-bg: #fff5cc;
  --hue0: #6a3fe0; --hue0-bg: #ece5ff; --hue1: #c0257c; --hue1-bg: #fce3f0; --hue2: #0b7f86; --hue2-bg: #d8f3f4; --hue3: #4b5b78; --hue3-bg: #e4e8f0; --on-who: #ffffff;
  --p0-bg: #1c1830; --p0-fg: #ffffff;
  --band: #1c1830; --band-fg: #f4f2f9; --band-muted: #b4aec8; --band-pill: #37314f;
  --on-solid: #ffffff;
  --display: "Bricolage Grotesque", "Avenir Next", "Segoe UI", system-ui, sans-serif;
  --sans: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Atkinson Hyperlegible Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #14121c; --surface: #1d1a29; --sunk: #0e0c15; --ink: #ece9f5; --muted: #a8a2bc; --faint: #746e8c; --line: #343048; --soft: #272337;
  --todo: #ff9a3d; --todo-ink: #ffb671; --todo-bg: #3a2410;
  --move: #5aa2ff; --move-ink: #94c2ff; --move-bg: #15294a;
  --done: #3ccb7f; --done-ink: #77e2a8; --done-bg: #10331f;
  --late: #d93a30; --late-ink: #ff948a; --late-bg: #3b1513; --on-late: #ffffff;
  --you: #ffd02e; --you-ink: #2a2000; --you-bg: #322a09;
  --hue0: #a98bff; --hue0-bg: #2a2149; --hue1: #ff7cc0; --hue1-bg: #40172f; --hue2: #4fd1c5; --hue2-bg: #10302f; --hue3: #a9b6cf; --hue3-bg: #262c3a; --on-who: #16121f;
  --p0-bg: #ece9f5; --p0-fg: #14121c;
  --band: #2b2642; --band-fg: #f4f2f9; --band-muted: #b4aec8; --band-pill: #423c5e;
  --on-solid: #0e0c15; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #14121c; --surface: #1d1a29; --sunk: #0e0c15; --ink: #ece9f5; --muted: #a8a2bc; --faint: #746e8c; --line: #343048; --soft: #272337;
  --todo: #ff9a3d; --todo-ink: #ffb671; --todo-bg: #3a2410;
  --move: #5aa2ff; --move-ink: #94c2ff; --move-bg: #15294a;
  --done: #3ccb7f; --done-ink: #77e2a8; --done-bg: #10331f;
  --late: #d93a30; --late-ink: #ff948a; --late-bg: #3b1513; --on-late: #ffffff;
  --you: #ffd02e; --you-ink: #2a2000; --you-bg: #322a09;
  --hue0: #a98bff; --hue0-bg: #2a2149; --hue1: #ff7cc0; --hue1-bg: #40172f; --hue2: #4fd1c5; --hue2-bg: #10302f; --hue3: #a9b6cf; --hue3-bg: #262c3a; --on-who: #16121f;
  --p0-bg: #ece9f5; --p0-fg: #14121c;
  --band: #2b2642; --band-fg: #f4f2f9; --band-muted: #b4aec8; --band-pill: #423c5e;
  --on-solid: #0e0c15; color-scheme: dark }

`;

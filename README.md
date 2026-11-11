<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="dsh-find-in-conversation icon">
</p>

<h1 align="center">dsh-find-in-conversation</h1>

<p align="center">
  A macOS-style find bar for the current DeepSeek Harness conversation.
</p>

<p align="center">
  <a href="https://github.com/donggongailv/dsh-find-in-conversation/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/donggongailv/dsh-find-in-conversation/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/donggongailv/dsh-find-in-conversation/blob/main/LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/donggongailv/dsh-find-in-conversation"><img alt="DeepSeek Harness plugin" src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-4c6ef5"></a>
</p>

English | [中文](README.zh.md)

## Why

DeepSeek Harness keeps long conversations in one scrollable transcript. This
plugin adds a small, keyboard-first find bar so you can jump through matches
without losing your place.

It is intentionally client-only: no host tools, no session events, no network
requests, and no changes to the conversation text.

## Features

- **Search from where you are.** The first match is chosen from the current
  viewport. A match must be fully visible to count; a sliver at the edge is
  skipped in favor of the next fully visible match.
- **Page-turn aware.** Matches already on screen reveal with minimal movement.
  A match on another screen is centered so it is easy to spot.
- **Navigation follows the viewport.** After you scroll manually, the next
  `⌘G` / `⇧⌘G` re-anchors to the first fully visible match on the current
  screen instead of continuing from the old active index; later presses move
  from that anchor.
- **Readable highlights.** Every match uses `#FFFB00` with black text. The
  active match starts yellow with a short scaled halo, then settles into
  `#B4D8FD` with black text.
- **Per-line halos.** Wrapped matches get one halo per rendered line instead of
  one large box around the whole range.
- **Wrap feedback.** Moving past the last match or before the first shows a
  brief centered toast so the loop is obvious.
- **IME aware.** While a Chinese/Japanese input-method candidate window is open,
  search is paused and highlights are cleared; the final text is searched after
  the candidate is committed.
- **Scoped shortcuts.** The find shortcut is only captured when focus is in the
  conversation, on the find trigger, on the page body, or while the bar is
  open. Settings, sidebars, and terminals keep their normal keyboard behavior.
- **Localized.** English and Chinese UI copy and plugin metadata.

## Keyboard shortcuts

| macOS              | Windows / Linux         | Action                                                                    |
| ------------------ | ----------------------- | ------------------------------------------------------------------------- |
| `⌘F`               | `Ctrl+F`                | Open the find bar and focus the input. Press again to reselect the query. |
| `⌘G`               | `Ctrl+G`                | Next match.                                                               |
| `⇧⌘G`              | `Ctrl+Shift+G`          | Previous match.                                                           |
| `Esc`              | `Esc`                   | Close the bar and restore the previous focus.                             |
| `Enter` / `⇧Enter` | `Enter` / `Shift+Enter` | Next / previous match while the input is focused.                         |

On macOS, `Ctrl+F` is deliberately **not** intercepted. On Windows and Linux,
the `Meta` key is not intercepted.

## Install

This package is a DeepSeek Harness bundle. Install the package directory through
the DSH Plugin Manager or add it to a profile's bundle list. It declares its
client module in `package.json` under `dsh.client` and inserts one plugin row
from `cordis.patch.yml`.

Requirements:

- DeepSeek Harness `>=0.2.2-rc.1 <0.3.0-0`
- A Chromium-based DSH client with the CSS Custom Highlight API
- macOS, Windows, or Linux

The plugin is client-only; there is no server-side configuration.

## How it works

- The find bar renders through `conversation.session.header.actions` and uses a
  body portal for its fixed-position UI.
- Search walks text nodes inside the active
  `[data-conversation-session]` transcript and ignores the composer, sidebar,
  and plugin UI.
- Matches are painted with `CSS.highlights`; conversation DOM is never wrapped
  or rewritten.
- A debounced `MutationObserver` keeps results fresh while a response streams
  or collapsible content changes.
- Timers, observers, listeners, styles, and locale registrations are owned by
  React/Cordis effects so closing the bar, HMR, or uninstalling the plugin
  removes them.

## Scope and limitations

- Search covers the currently rendered transcript. History that has not been
  loaded, virtualized rows, and collapsed content that is not in the DOM are not
  searchable.
- Search is literal text, not a regular expression or fuzzy search.
- The plugin relies on the browser's CSS Custom Highlight API; a browser without
  it still gets counting and navigation, but not painted highlights.
- The active-match halo is a separate overlay because highlight pseudo-elements
  cannot scale glyphs. The yellow fill is exact; the scaling is the halo around
  it.
- The icon is an original SVG drawn for this project in the same visual language as the built-in DSH plugin icons, and licensed under MIT.

## Development

```bash
git clone https://github.com/donggongailv/dsh-find-in-conversation.git
cd dsh-find-in-conversation
npm install
npm test
npm run check
npm run format:check
```

There is no build step. `client.js` is the browser module loaded directly by the
Harness module loader; React and React DOM are supplied by the platform, not
bundled.

`npm test` validates the manifest, patch, locales, client entry point, icon, and
license files. `npm run check` also runs `node --check client.js`.

## Project layout

| Path                       | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `client.js`                | The complete client-side plugin: UI, search, highlights, shortcuts. |
| `index.js`                 | Host half; intentionally empty because the plugin is client-only.   |
| `package.json`             | Package metadata and DSH client/bundle declarations.                |
| `cordis.patch.yml`         | Inserts the `dsh-find-in-conversation` plugin row.                  |
| `locale/`                  | Plugin Manager title and description metadata.                      |
| `assets/icon.svg`          | Original vector icon in the DSH house style.                        |
| `test/`                    | Manifest, asset, and packaging checks.                              |
| `.github/workflows/ci.yml` | Formatting and test CI.                                             |

## Links

- [Repository](https://github.com/donggongailv/dsh-find-in-conversation)
- [Issues](https://github.com/donggongailv/dsh-find-in-conversation/issues)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE) © imhansai.

The icon is an original SVG drawing, licensed under MIT.

# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-10

### Added

- A macOS-style find bar for the current DeepSeek Harness conversation.
- `⌘F` / `Ctrl+F` to open and focus search, `⌘G` / `Ctrl+G` for the next match,
  and `⇧⌘G` / `Ctrl+Shift+G` for the previous match.
- Match case and highlight-all options with a live `current of total` counter.
- Search from the current viewport, requiring a fully visible match; page-turn
  navigation centers the selected match.
- Minimal scrolling for matches already on screen or only partially visible.
- Yellow `#FFFB00` match highlights and a `#B4D8FD` active-match highlight.
- A 500 ms yellow pulse with a scaled, per-line halo before the active match
  settles into blue.
- A transient wrap toast when navigation loops from the last match to the first
  or from the first match to the last.
- IME-aware search: no highlighting while an input-method candidate window is
  open.
- Shortcut scoping that preserves `⌘F` / `Ctrl+F` outside the conversation and
  avoids `Ctrl+F` on macOS.
- English and Chinese UI copy, plugin metadata, and an original SVG icon.

[Unreleased]: https://github.com/donggongailv/dsh-find-in-conversation/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/donggongailv/dsh-find-in-conversation/releases/tag/v1.0.0

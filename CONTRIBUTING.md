# Contributing

Thanks for taking a look at `dsh-find-in-conversation`.

## Development setup

```bash
git clone https://github.com/donggongailv/dsh-find-in-conversation.git
cd dsh-find-in-conversation
npm install
npm test
npm run check
npm run format:check
```

`npm test` validates the plugin manifest, locale files, bundle patch, client
entry point, icon dimensions, and license files. `npm run check` additionally
runs a JavaScript syntax check.

There is no build step: `client.js` is the browser module that DeepSeek Harness
loads directly. Keep it dependency-free apart from the React and React DOM
platform seeds provided by the harness module loader.

## Local testing

Install the directory as a DSH bundle through the Plugin Manager or the
`plugin_manager` install action, then open a conversation and press `⌘F` /
`Ctrl+F`.

For client-only edits, the DSH client HMR watcher reloads `client.js` after a
short polling interval. If a change does not appear, refresh the page.

## Design constraints

- Do not modify the conversation DOM to render matches. Use the CSS Custom
  Highlight API and cleanup every `CSS.highlights` entry when the bar closes or
  the plugin unloads.
- Keep the bar usable on macOS and non-macOS platforms; `⌘` on macOS and `Ctrl`
  elsewhere.
- Preserve host shortcuts outside the conversation. Do not intercept `⌘F` when
  focus is in Settings, a sidebar, a terminal, or another non-conversation
  surface.
- Keep all timers, listeners, observers, styles, and locale registrations owned
  by a React effect or Cordis effect so HMR and uninstall remove them.
- Use the `dsh-fic-` prefix for CSS classes and `dsh-fic-*` names for
  `CSS.highlights`, so the plugin cannot collide with another DSH plugin.
- Do not add network requests, host tools, session events, or persistent state
  for a client-only search feature.

## Pull requests

- Run `npm run format` before committing.
- Run `npm run check` and describe the behavior you verified.
- Include a short note when a change affects keyboard handling, IME behavior,
  or DOM access.
- Keep changes focused; visual polish and search behavior should be reviewable
  independently.

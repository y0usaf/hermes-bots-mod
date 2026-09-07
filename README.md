# hermes-bots-mod

A local-first fork of the bundled Bots plugin for the [Hermes desktop app](https://hermes-agent.nousresearch.com).

## Features

- Always-expanded bot sections without bordered cards or disclosure controls.
- Centered bot avatar and name; a separate options button.
- Click a bot name to open its canonical Bot Chat, or select an individual session below it.
- Session switching updates the selected bot and workspace before hydration, preserving remote routing.
- Canonical titles stay intact; sessions sort by recorded last activity.
- Session status indicators and elapsed-time labels.
- Existing bot settings, groups and backend safety behavior retained.

This release uses a custom Sessions-style row. The experimental copied native Sessions renderer and its hover marquee are **not included**.

## Install

Copy `plugin.js` to `$HERMES_HOME/desktop-plugins/bots-mod/plugin.js` (normally `~/.hermes/desktop-plugins/bots-mod/plugin.js`). Back up the previous file first. If the destination is a managed symlink, replace the local link rather than writing through it.

The desktop app normally hot-reloads the plugin. Otherwise use the command palette → **Reload desktop plugins**. Disable the bundled Bots plugin in Settings → Plugins to avoid duplicate panes.

NixOS/Home Manager activation may restore its packaged plugin. Update your declarative package separately to retain this version across switches.

## Verification

Requires Node.js for the regression suite:

```sh
node --check plugin.js
node roster.test.mjs plugin.js
```

Six roster regressions cover titles, activity ordering, remote ownership, cross-bot switching, always-expanded sections, and centered bot-name navigation. Backend safety regressions were also run against the release artifact locally. Live behavior is version-dependent; tested locally with Hermes desktop 0.17.0.

Only `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime` are external dependencies of the plugin bundle.

## License

MIT; retains the upstream Hermes-derived plugin code.

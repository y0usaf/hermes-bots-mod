# hermes-bots-mod

A local-first fork of the bundled Bots plugin for the [Hermes desktop app](https://hermes-agent.nousresearch.com).

## Features

- Compact left-aligned shelf of 56px square tiles for bots without visible chats, with 26px avatars and names; transparent at rest with a themed hover/focus highlight (`--chrome-action-hover`).
- Full-width expanded sections for bots with visible chats; matching 22px inline avatars aligned to the session-row left edge.
- One global internal-chat visibility toggle immediately left of the notification bell.
- Canonical Bot Chat threads hidden by default, with direct access through each bot menu.
- Archive-next navigation excludes internal chats while they are hidden.
- No unsolicited greeting when opening a bot conversation.
- Centered bot avatar and name; a separate options button.
- Session status indicators and elapsed-time labels with tabular-numeric timestamps.
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
node shelf.test.mjs plugin.js
# Optional real Chromium layout check (chromium on PATH):
python3 layout.test.py
```

Regression suites cover titles, activity ordering, remote ownership, cross-bot switching, global internal visibility, compact eligibility, avatar sizes and navigation. The Chromium fixture checks square 56px tiles, left alignment, transparent-at-rest compact tiles with themed hover/focus highlight, wrapping at narrow widths and full-width expansion with an enlarged root font and conflicting container styles. Real `:hover` can be driven headlessly via CDP, though this `--dump-dom` fixture does not do so: it only asserts the hover rule exists and exercises the `:focus-within` path live. It is not a substitute for visual verification in the running desktop. The approved layout was iterated in the desktop before publication.

Only `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime` are external dependencies of the plugin bundle.

## License

MIT; retains the upstream Hermes-derived plugin code.

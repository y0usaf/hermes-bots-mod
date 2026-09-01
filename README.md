# hermes-bots-mod

A fork of the bundled **Bots** plugin for the [Hermes](https://hermes-agent.nousresearch.com) desktop app, rebuilt as a hot-reloadable disk plugin.

Bot Mode roster personality, fused with the sessions list. Each bot renders as a single card: avatar + name centered, online status dot pinned right (live working/idle/needs-input states), and that bot's chat sessions listed inside the box.

## Features

- **Bot cards, not bot rows + detached session lists** — avatar, name, and status dot as one centered unit; sessions live inside the same bordered card
- **Live online status dot** — the SDK `SessionStatusDot` fed the bot's *actually-active* session (most recent of canonical/last session), so it lights up while the bot works, shows needs-input / unread / background states
- **Session list that behaves**:
  - 3s poll + refetch-on-focus (was 10s), so archived sessions disappear promptly
  - Opening a session immediately invalidates the list cache
  - Sessions **reorder on activity** — message-count bumps float a session to the top
  - Coarse elapsed timer per session (age) instead of a bare message count
  - Open session gets its own accent ring + bold text
- **No auto-kickoff on click** — clicking a bot opens its thread silently; the "Hey, tell me about yourself!" greeting only fires on genuine first creation of a bot with an empty session

## Install

1. Copy `plugin.js` into your Hermes desktop plugins dir:

   ```bash
   mkdir -p ~/.hermes/desktop-plugins/bots-mod
   cp plugin.js ~/.hermes/desktop-plugins/bots-mod/plugin.js
   ```

2. In the Hermes desktop app: **⌘K → Reload desktop plugins** (or restart the app).

3. **Disable the bundled Bots plugin** in Settings → Plugins. Two copies registering the same panes double-render.

## Requirements

- Hermes desktop app (plugin SDK with `SessionStatusDot`, React Query doors — tested against desktop 0.17.0)
- Gateway that supports `session.list` / `session.create` / `prompt.submit` profile-scoped RPCs (bot-mode protocol)

## Notes

- The file is a plain-ESM esbuild bundle of the bundled `hermes-bots` plugin fork; only `@hermes/plugin-sdk`, `react`, `react/jsx-runtime` are external.
- Built for personal use — tested on a split desktop/gateway (finix) setup. YMMV on other versions; the plugin hot-reloads, so tweaking is cheap.
- Bot appearance data (avatars, pins, groups) is read/written under the same `ui_meta['hermes-bots']` keys as the bundled plugin, so swapping back and forth won't lose your setup.

## License

MIT

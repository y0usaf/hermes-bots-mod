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


## Persistent Hide bot (local visibility only)

Choose **Hide bot** in a bot's options menu. Its shelf tile, roster entry,
current/future session rows, autocomplete suggestions and activity toasts disappear.
The global internal-chat eye cannot reveal an explicitly hidden bot. No bots are
hidden by default.

**Hidden bots** stays above the navigation results, including an empty roster,
unmatched search and an unavailable gateway. Expand it and use **Show** to restore
by stored connection-qualified identity, even if the source no longer exists.
Showing a bot keeps the current search/activity filters and internal-chat eye
setting. A missing source becomes visible normally once available again.

An already-open hidden conversation stays open and may keep running. Hiding never
archives, deletes, cancels, modifies profile metadata, or switches that workspace
pane. Refresh cannot select the hidden bot or replace the focused hidden pane's
workspace scope. Other panes and stored conversations are untouched. Shared group
threads and their execution membership remain intact; hiding is navigation
filtering, not transcript redaction or a privacy/security boundary. Groups with no
visible members leave the roster. Typed manual **@mentions** and subagent/relay
execution keep working; only mention autocomplete is suppressed.

One explicit visibility map is stored in plugin storage `hidden-bots-v2`, keyed
by JSON `[connectionId, profileName]` pairs. Valid entries from the earlier local
`hidden-bots-v1` prototype are read only when v2 is absent. Legacy profile
`metadata.hidden` keeps its existing separate Hidden disclosure; it is neither
imported nor changed by Hide/Show. Existing legacy-hidden bots also retain a
"Show in main roster (legacy)" menu action for the old behavior.

Loading finishes before normal navigation/auto-selection begins. Local hide AND
show decisions override late reads (show tombstones are retained). Writes are
serialized. A failed read pauses navigation with **Retry loading** rather than
silently overwriting unknown stored data. A failed save keeps the local decision
but reports **not saved** with **Retry saving**; persistence is not promised until
that retry succeeds. Storage is local to this desktop plugin, not profile config
or a gateway-wide opt-out; concurrent independent desktop processes are not a
transactional shared visibility store.

### Hide-mode tests and declarative delivery

`npm ci --ignore-scripts --no-audit --no-fund` installs test-only dependencies.
Run `node hide.test.mjs plugin.js`. Each case evaluates the full production module
and calls its actual register(), then uses React DOM/jsdom for mount, hooks and
button/input events. SDK UI primitives, host/query/storage/timers and gateways are
synthetic; these tests do not use a live account or claim live desktop validation.
The existing roster/shelf/archival checks remain required. The current pinned
compact transparent shelf CSS is retained byte-for-byte.

Finix applies a local patch to the published pinned source and builds test-only
React dependencies using `buildNpmPackage` and a locked fixed-output npm cache;
no vendored node_modules, unpublished pin, or new plugin runtime dependency is
needed. The package-only build does not install or activate the plugin. Integration
into the main Finix branch and any deployment require separate approval.

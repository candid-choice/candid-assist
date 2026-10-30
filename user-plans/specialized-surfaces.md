# Specialized Surfaces & Web Agency (product pivot)

**Premise (user-directed):** don't compete with what an IDE + coding agent
already does (open images, echo terminal output). Compete on what they
**can't** do: persistent-authenticated web agency, consent-gated human
in the loop, and rich workbenches that would need multiple IDE plugins.

## Shipped (this branch)

- **Persistent web logins** — embedded `<webview>` uses
  `partition="persist:harness-web"`: sign into Google/ChatGPT/GitHub once
  (via human handoff), the profile survives restarts and every future
  agent session reuses it.
- **Permission-before-use** — `src/permission-broker.ts`: any
  navigation to a non-granted domain broadcasts `permission:request`;
  human answers Allow once / Always allow / Deny (modal in renderer).
  Always-grants persist (IndexedDB) and re-sync to the server on every
  ws (re)connect (`permission:sync`). Fail-closed on timeout/no-UI.
- **Guide reframed** — `SessionEmptyGuide` now leads with the web
  agency pillars (search, Drive, ChatGPT, scraping, handoff), keeps
  human-decision surfaces (input/diff/processes), flags roadmap
  workbenches, and demotes IDE-equivalents to "also works".

## Next (proposal, in order)

1. **Grant manager UI** — Settings ▸ Web Access: list granted domains,
   revoke individually, clear profile cookies (partition wipe) with
   confirm. Small: store already holds `browserGrants`; main needs a
   `partition:clear` IPC (`session.fromPartition('persist:harness-web')
   .clearStorage()`).
2. **Domain recipes** — first-class recipes for the headline flows:
   `googleSearch(query)`, `readGoogleDriveDoc(url)`,
   `scrapeSelective(url, selector|goal)`. Implemented as MCP tools that
   compose the browser primitives + record consent per recipe.
3. **Three.js 3D viewer surface** — `open3dSurface({ modelUrl|primitives,
   camera })`: OrbitControls viewer, agent can push scene updates
   (`3d:update` events). Use case: enclosures, mechanisms, data as
   geometry.
4. **Circuit JSON / E-CAD viewer** — accept the circuit-json spec
   (components, nets, board outlines) → schematic + simple PCB preview
   (svg render; zoom/pan). Pair with an MCP tool
   `openCircuitSurface({ circuitJson })`. Validation errors surface as
   badges.
5. **Webdev live preview surface** — iframe of a dev-server URL with
   device presets (mobile/desktop widths), console/network error relay
   to the agent (`browserSnapshot`-equivalent for local pages), and
   element pick → sends selector + rect back to the agent.
6. **Consent polish** — per-session grant expiry (e.g. 24h), "grant for
   this domain tree" (drive.google.com/* vs exact host), audit log
   panel (who visited what, when).

## Non-goals

- Generic file/image viewing, terminal emulation, code editing — IDE
  already owns those; keep only as incidental utilities.

## Verification so far

- Desktop: 52 tests (broker unit + tool-level allow/deny integration).
- Renderer: 216 tests (gate modal, grants persistence, guide content,
  presence-over-IPC, session tabs, delete flows).

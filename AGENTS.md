<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- The prototype is one route (`/`) driving an in-memory screen stack in `src/components/humnazar/Prototype.tsx`; screens are not separate routes because the flow keeps session state and slide/fade transitions inside one phone frame.
- Flow rules (who accepts, timing, request numbers) live in `src/lib/humnazar/logic.ts` with tests beside it; all copy lives in `src/lib/humnazar/i18n.ts` with matching English and Urdu keys.
- Humnazar styles are `hz-` prefixed component classes on tokens in `src/styles.css`; components never use raw colours.
- Blind-user screens are voice-first: speech and recognition go through `src/lib/humnazar/speech.ts`, spoken-word parsing (including confirm/cancel/repeat/back and screen command words) through `src/lib/humnazar/voice-words.ts` (tested). Each screen passes its question and accepted answers to `Frame` via `voice`; forward actions go through `press`/`ConfirmBtn`, which speak the action and listen for a spoken confirm. On blind-user screens (not Start, not Choose language for a volunteer) a capture-phase click handler on the screen and the end-call dialog turns every tap on a control into "repeat the prompt" — taps never select or navigate. The app never listens while speaking (`say` stops listening first). Start and volunteer screens opt out via `VOLUNTEER_SCREENS`; Start runs its own voice loop only after a tap anywhere (browsers block speech before a user gesture) and goes straight to the next screen without a confirm step; the Choose language screen is voice-enabled for both roles because language is not known yet.

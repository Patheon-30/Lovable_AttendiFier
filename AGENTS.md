<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Attendance windows are enforced server-side through periodAt, and the database unique constraint enforces once-per-day-per-period scans before SMS delivery; client controls cannot bypass either rule.

The practice workspace is a public browser-local simulation using its own storage key and no production clients or SMS imports; its entry phrase is a demo selector, never authentication, so edits cannot affect live data and do not sync across devices.

Monthly attendance uses an insert-triggered snapshot archive with teacher-section RLS and no student foreign key, so removing a student cannot erase historical names or scans.

Automatic time-outs are persisted scheduled cutoffs and displayed only after they pass; they never claim verified departures, and historical scans without time-out evidence stay blank.

Excel compilation runs in the browser from paginated RLS-scoped archived records with one sheet per month, preserving historical status instead of recalculating it under newer schedules.

Code reaches the user's GitHub repository through the connector gateway (Contents API for the first commit, then the Git Data API tree); the workspace never runs git push, and the uploaded copy excludes .env, .git, dependencies, and backend config.

Android packaging is a browser-backed launcher for the published HTTPS app, not an embedded WebView, so existing browser camera, passkey, storage, and Excel-download behavior remains intact; APK builds do not bundle server secrets or claim offline support.

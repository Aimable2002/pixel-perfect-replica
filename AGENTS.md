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

## Architecture rules
- Payment provider calls live only in `src/lib/payment-backend.server.ts` (currently simulated with setTimeout); swap its bodies for the real external backend — never add provider logic elsewhere.
- Prices are always computed server-side via `src/lib/pricing.ts`; public responses expose only the final price.
- Protected contact data/photos are read only in server functions after checking an active `access_grants` row; photos are served via short-lived signed URLs from a private bucket.
- Admin actions verify `has_role(admin)` before using the service-role client, and write to `audit_logs`.

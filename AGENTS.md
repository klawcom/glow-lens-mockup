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

# Project rules

- Theme colors live only in src/styles.css `[data-theme]` blocks, listed in src/theme/themes.ts — components use semantic tokens so themes swap without component edits.
- App name/tagline come from src/config/app.ts — single place to rename the app.
- Product data lives in src/data/products.ts with the `Product` type — keep that shape when swapping in an API.
- Screens are TanStack file routes in src/routes (the "pages"); shared UI in src/components.

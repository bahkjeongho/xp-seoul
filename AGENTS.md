## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---

## 🏛️ Obsidian Vault Ingestion & Folder Visibility Rules (CRITICAL)

The live Obsidian Vault is located at:
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Hide Park` (iCloud Drive)

Run `./update.sh` (or `npm run update`) to sync all vault changes into `siren` in ~2 seconds.

### Folder Rules

1. **`0. Clipping Origin` (Strictly Excluded)**:
   - Contains raw clipping archives from web magazines/blogs for personal archiving.
   - **MUST NEVER be ingested or published to the web** due to copyright/licensing issues.
   - Filtered out during vault scan in `scripts/build-data.mjs`.

2. **`00. Template` (Strictly Excluded)**:
   - Contains internal Obsidian templates, snippets, and insert codes.
   - **MUST NEVER be published to the web**.
   - Filtered out during vault scan in `scripts/build-data.mjs`.

3. **`1. Thoughts` (Dedicated Menu Folder)**:
   - Reserved for the upcoming 'Thoughts' view / blog menu.
   - Notes in this folder **MUST NOT appear in the default Wiki archive / Stream / Globe**.
   - Will be ingested separately for the Thoughts view.

4. **`2. Wiki` Sub-folders with `unlisted: true` (Hidden from stream, searchable & linkable)**:
   - The following folders contain high-volume sub-entity notes that clutter general scrolling:
     - `23. K-Pop Idol` (or `24. K-Pop Idol` / `*K-Pop Idol*`): Individual idol group members
     - `24. Academic Program` (`*Academic Program*`): Specific school/degree programs
     - `25. Sports Team` (`*Sports Team*`): Specific clubs/teams
     - `26. Journal` (`*Journal*`): Journal articles, periodicals, and magazine issues
   - **Display Rule**:
     - **Hidden from default Stream scrolling & Globe 3D dragging** (when search query is empty).
     - **Full Searchability**: When user searches via the Search bar, these notes ARE matched and displayed.
     - **Full Wikilink / Backlink resolution**: Parent documents (e.g., K-Pop Group notes linking to members under `People`, university notes linking to academic programs, publisher notes linking to journals) can link to them via `[[wikilink]]`, and clicking opens their full note modal/bottom sheet.
     - Implemented via `unlisted: true` flag in `scripts/build-data.mjs`, `XPSeoulApp.tsx`, and `GlobeStreamCanvas.tsx`.

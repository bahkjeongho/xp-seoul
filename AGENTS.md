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

### Folder Rules (Updated for Reorganized Vault)

1. **`00. Template` & `1. System` & `10. Clipping Origin` (Strictly Excluded / Private)**:
   - `00. Template`: Internal Obsidian templates and snippets.
   - `1. System`: Classification and system prompt documentation (`Categorizing.md`, `Wiki System.md`).
   - `10. Clipping Origin`: Raw clipping archives from web magazines/blogs for personal archiving (copyright protected).
   - **MUST NEVER be ingested or published to the web**. Filtered out during vault scan in `scripts/build-data.mjs`.

2. **`E_Text` (Curated Texts / Excluded from Wiki)**:
   - External translated texts and reading lists.
   - Kept out of the default Wiki archive; reserved for manual sharing via Blog/Magazine later.

3. **`C_Blog` & `D_Magazine` (Dedicated Views)**:
   - `C_Blog`: Personal essays and thoughts (serves the 'Blog' menu).
   - `D_Magazine`: Curated collections, top 10 lists, toolkits, and editorial features (serves the 'Magazine' menu).

4. **`A_Wiki` & `B_Object` (`unlisted: true` Rules)**:
   - **Default Listed (Public Stream & Globe)**:
     - Root markdown files in `A_Wiki/` that have creative/cultural categories (`The Arts`, `Design`, `Media`, `Culture`, `Entertainment`, `Business`).
   - **Unlisted (`unlisted: true`) (Hidden from general Stream & Globe, searchable via Search Bar & accessible via [[wikilinks]]/backlinks)**:
     - Sub-folders under `A_Wiki/`:
       - `A1_Hub` (Hub notes)
       - `A2_K-Pop Idol` (Individual idol members)
       - `A3_Academic Program` (Academic degree programs)
       - `A4_Journal` (Journals & periodicals)
       - `A5_Sports Team` (Clubs & sports teams)
     - All notes under `B_Object/` (B1_Music, B2_Architecture, B3_Video, B4_Film objects/works).
     - Pure `Technology` or `Humanities` Category notes without creative/cultural overlap. (Notes with mixed categories like OP-1 with `The Arts` + `Technology` remain Listed).

---

## 🎨 UI/UX Interaction & Filtering Architecture (CRITICAL)

### 1. Filter System & Toggle Rules (`DesktopStreamFilterBar`, `MobileDetailBottomSheet`, `GlobeStreamCanvas`)
- **Direct Selection & Hierarchical Stacking**:
  - Clicking any filter item (Category / Sub / Topic) applies immediately without requiring an extra "+ Add" button.
  - Selecting a child item (e.g., Sub `Fashion` under Category `Design`) automatically refines/replaces the parent-level slot to avoid redundant filter collisions.
  - Clicking the same item toggles it **OFF** and removes it from the active filter slots.
  - Active filter items display with a dark active badge and an `X` icon to visually confirm toggle status.
  - Active filter slots support multi-selection (OR within the same axis, AND across different axes/slots).
  - Quick Reset button is fixed at the start (leftmost) of the filter bar for easy access when many filters are active.

### 2. 3D Globe Mode Interactions (`GlobeStreamCanvas`)
- **Drag vs. Zoom Separation**:
  - Dragging (click & drag on Desktop, single-finger drag on Mobile) strictly rotates and repositions the globe.
  - Scrolling (mouse wheel vertical scroll on Desktop, two-finger pinch on Mobile) controls camera zoom in/out. Horizontal wheel scrolling is ignored.
  - **Zoom Center (Anchor Point)**: Locked to the center of the viewport `(0.5, 0.5)` so zooming does not drift towards the top-left or header.
  - **Zoom Level & Scale Limits**: Baseline zoom is bounded between `50%` (max zoom out) and `150%` (max zoom in) with dynamically balanced card gaps to prevent card overlap on zoom-in.
  - **Filtered Note Count Rule**: When filtering yields a small number of notes (even 1 note), the globe displays **only the matched notes without duplicating/repeating cards** across empty slots.

### 3. Mobile Touch & Sheet Scroll Safety
- In mobile viewports, the canvas's global `touchmove` listener ignores touches originating inside interactive overlays (`.interactive-control`, bottom sheets, modals).
- Bottom sheets use `touchAction: 'pan-y'`, `overscroll-contain`, and stop touch event propagation so that Category, Sub-items, and Topics remain fully scrollable on touch devices.

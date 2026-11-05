# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run update`          | Sync notes from Obsidian Vault (`./update.sh`)   |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🏛️ Obsidian Vault Ingestion Rules

- Live Obsidian Vault: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Hide Park`
- Run `./update.sh` (or `npm run update`) to sync changes in ~2 seconds.
- **Excluded Folders**: `0. Clipping Origin`, `00. Template` (Never published to web).
- **Thoughts**: `1. Thoughts` (Dedicated view, not in main Wiki).
- **Unlisted Folders (`unlisted: true`)**: `23. K-Pop Idol`, `24. Academic Program`, `25. Sports Team`, `26. Journal`.
  - Excluded from general stream scrolling & globe canvas.
  - Fully searchable via the Search bar.
  - Fully accessible via wikilinks and backlinks from parent notes.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

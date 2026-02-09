# Astro Starter Kit: Basics

```sh
pnpm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## Deploy to Netlify

This app is configured for [Netlify](https://www.netlify.com/). To deploy:

1. **Push your repo** to GitHub/GitLab/Bitbucket and connect it in the [Netlify dashboard](https://app.netlify.com/).
2. **Build settings** (usually auto-detected via `netlify.toml`):
   - **Build command:** `pnpm run build`
   - **Publish directory:** `dist`
3. **Environment variable:** In Netlify → Site settings → Environment variables, add:
   - `DATABASE_URL` = your Neon (or other) database connection string

Then trigger a deploy. Your API routes (e.g. `/api/guests`) will run as Netlify Functions.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# UIcraft

A collection of interface animations and interactions rebuilt to understand how they work. Each study includes an interactive demo, implementation code, and an explanation.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The craft studies are at `/craft`.

## Configuration

Set `NEXT_PUBLIC_SITE_URL` to the site's production URL when deploying. It is used for canonical URLs, the sitemap, and social metadata. The Google and Bing verification values in `.env.example` are optional.

## Project structure

- `src/content/craft/` contains the MDX studies and their metadata.
- `src/components/mdx/` contains the interactive demos and MDX components.
- `src/app/` contains the routes, metadata, sitemap, robots file, and RSS feed.

Run `npm run build` to check a production build.

## License

MIT. See [LICENSE](LICENSE).

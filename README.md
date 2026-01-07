# Site generator experiment

This repository holds experimental deck content and a simple static build pipeline for publishing to GitHub Pages.

## Decks

- **india1** – Dubai transit tips plus overviews for Bengaluru, Udaipur, Jodhpur, Jaipur, Delhi, Kochi, and the Art of Living Ashram.

## Build and preview

```bash
scripts/build.sh
```

The script assembles the static site into the `/gh-pages` directory for local preview or GitHub Pages deployment.

## GitHub Pages URL

After pushing to `main`, GitHub Actions builds and publishes the site. View it at:

```
https://<your-github-username>.github.io/siteprep/
```

Open the India1 deck directly at:

```
https://<your-github-username>.github.io/siteprep/decks/india1/
```

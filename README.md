# Site generator experiment

This repository holds experimental deck content and a simple static build pipeline for publishing to GitHub Pages.

## Decks

- **india1** – Dubai transit tips plus overviews for Bengaluru, Udaipur, Jodhpur, Jaipur, Delhi, Kochi, and the Art of Living Ashram.
- **aus2503** – Guerilla Bay hiking, WOMADelaide 2026, and Brisbane cultural highlights.

### Deck Configuration

Each deck can optionally include a `deck.json` file to customize its appearance on the homepage.

#### deck.json Format

Create a `deck.json` file in your deck's root directory (e.g., `/decks/india1/deck.json`):

```json
{
  "title": "India Travel Guide 2024",
  "sort_order": "01",
  "description": "Dubai transit tips plus overviews for Indian cities."
}
```

**Fields:**
- `title` (optional): Display name for the deck on the homepage. Defaults to the folder name if not specified.
- `sort_order` (optional): String used to sort decks on the homepage (lexicographic sort). Defaults to the folder name if not specified.
- `description` (optional): Description shown on the homepage card. Defaults to the folder name if not specified.

**Sorting behavior:**
- Decks are sorted lexicographically by `sort_order`
- Use numeric prefixes for simple ordering: `"01"`, `"02"`, `"03"`
- Or use descriptive strings: `"main"`, `"secondary"`, `"archive"`
- Without `deck.json`, decks default to alphabetical order by folder name

## Google Places API Integration

Some pages use the Google Places API to display location images. To enable this feature:

1. Get a Google Places API key (free tier available)
2. Copy `config.example.js` to `config.js`
3. Add your API key to `config.js`
4. Use the helper script to get photo references: `./scripts/get-photo-references.sh YOUR_API_KEY PLACE_ID`

For detailed setup instructions, see [GOOGLE_PLACES_SETUP.md](GOOGLE_PLACES_SETUP.md).

**Note:** `config.js` is gitignored to keep your API key secure. Never commit API keys to the repository.

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

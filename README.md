# Release Tracker Site

Static GitHub Pages site for presenting weekly product release updates.

## Files

- `index.html` - tabbed presentation layout
- `css/styles.css` - visual styling and responsive behavior
- `js/config.js` - source mode + URL config
- `js/app.js` - fetch, tab routing, card rendering
- `data/test-releases.json` - local fixture for frontend validation (fake data only)

## Configure

1. For local frontend validation (default):
   - `window.RELEASE_TRACKER_SOURCE = "mock"`
   - `window.RELEASE_TRACKER_MOCK_URL = "data/test-releases.json"`
2. For Retool integration:
   - `window.RELEASE_TRACKER_SOURCE = "api"`
   - `window.RELEASE_TRACKER_API_URL = "https://<your-retool-webhook-url>"`
3. Ensure mock/API payload returns this shape:
   - `generated_at`
   - `now_live: []`
   - `coming_soon: []`
   - `on_the_horizon: []`

Each item supports nullable fields:

- `title`
- `plans`
- `description`
- `slack_channel`
- `feature_brief_url`
- `expected_date`

Do not commit real release information to `data/test-releases.json`; keep fixture content synthetic.

## Local Preview

From this repo:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Deploy

Publish this repository with GitHub Pages from the default branch root.

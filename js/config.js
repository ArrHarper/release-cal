// Data source can be "mock" for local JSON validation or "api" for Retool webhook.
window.RELEASE_TRACKER_SOURCE = "mock";

// Used when RELEASE_TRACKER_SOURCE is "mock".
window.RELEASE_TRACKER_MOCK_URL = "data/test-releases.json";

// Used when RELEASE_TRACKER_SOURCE is "api".
window.RELEASE_TRACKER_API_URL = "https://your-retool-webhook-url-here";

# Breakdown Review — 2026-10-23 — C/C++

Issue: #36
Date: 2026-10-23
Language: C/C++
Status: COMPLETED

## Repo 1 — geode-sdk/geode

- file_path: loader/src/server/Server.cpp
- snippet_url: https://github.com/geode-sdk/geode/blob/main/loader/src/server/Server.cpp#L805-L829

file_intent: Mod-version-aware server request builder
breakdown_what: Builds an HTTP GET request to Geode's mod index server by pattern-matching on a version variant (latest, major-pinned, or specific) to pick the URL's version segment and an optional query parameter, then awaits the response via coroutine.
breakdown_responsibility: Centralizes how Geode's loader queries the mod server for available mod versions, letting callers request "latest", "latest within a major version", or an exact version through one unified async call.
breakdown_clever: ModVersionMajor sets versionURL to "latest" exactly like ModVersionLatest does, and relies entirely on the extra `req.param("major", ...)` query parameter to narrow the server-side search — the URL path itself never encodes "major" at all, only the query string does.
project_context: Geode is a mod loader and SDK for Geometry Dash that manages mod hooks itself rather than just injecting DLLs, aiming to let many mods run together without incompatibilities, button conflicts, or hooks silently breaking.

### Reformatted Snippet

```c
auto req = web::WebRequest();
req.userAgent(getServerUserAgent());

std::string versionURL;
std::visit(makeVisitor {
    [&](ModVersionLatest const&) {
        versionURL = "latest";
    },
    [&](ModVersionMajor const& ver) {
        versionURL = "latest";
        req.param(
            "major",
            std::to_string(ver.major)
        );
    },
    [&](ModVersionSpecific const& ver) {
        versionURL = ver.toNonVString();
    },
}, version);

auto response = co_await req.get(
    formatServerURL(
        "/mods/{}/versions/{}?gd={}"
        "&platforms={}",
        id,
        versionURL,
        Loader::get()->getGameVersion(),
        GEODE_PLATFORM_SHORT_IDENTIFIER
));
```

## Repo 2 — Fincept-Corporation/FinceptTerminal

- file_path: fincept-qt/src/algo_engine/CandleAggregator.cpp
- snippet_url: https://github.com/Fincept-Corporation/FinceptTerminal/blob/main/fincept-qt/src/algo_engine/CandleAggregator.cpp#L15-L43

file_intent: Real-time OHLCV candle builder
breakdown_what: Ingests a single price tick under a mutex lock and either seeds the first candle, rolls over to a new candle once the period boundary passes, or updates the current candle's close, high, low, and volume in place.
breakdown_responsibility: Forms the core aggregation step in Fincept's charting pipeline, converting a raw stream of trade ticks into fixed-interval OHLCV candles that the UI and algo-trading logic consume downstream.
breakdown_clever: The candle only rolls over when a new tick arrives — a quiet period with no ticks leaves the prior candle open indefinitely instead of auto-closing on a timer, so downstream code can end up reading a stale, never-finalized candle.
project_context: FinceptTerminal is an open-source financial intelligence platform offering multi-asset market analytics, investment research, and 100+ data connectors, pitched as a free alternative to costly terminals like Bloomberg's.

### Reformatted Snippet

```c
void CandleAggregator::on_tick(
    double price,
    double volume,
    int64_t timestamp_ms
) {
    QMutexLocker lock(&mutex_);

    if (!has_first_tick_) {
        has_first_tick_ = true;
        int64_t candle_start =
            align_to_period(timestamp_ms);
        current_.open_time = candle_start;
        current_.close_time =
            candle_start + period_ms_;
        current_.open = price;
        current_.high = price;
        current_.low = price;
        current_.close = price;
        current_.volume = volume;
        current_.is_closed = false;
        return;
    }

    if (timestamp_ms >= current_.close_time) {
        close_current_and_open_new(
            timestamp_ms, price, volume
        );
        return;
    }

    current_.close = price;
    if (price > current_.high)
        current_.high = price;
    if (price < current_.low)
        current_.low = price;
    current_.volume += volume;
}
```

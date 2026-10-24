# Snippet Candidates — 2026-10-23 — C/C++

Issue: #36
Date: 2026-10-23
Language: C/C++
Status: PENDING_SELECTION

## Repo 1 — geode-sdk/geode

### Candidate 1 (most important)

- file_path: loader/src/server/Server.cpp
- snippet_url: https://github.com/geode-sdk/geode/blob/main/loader/src/server/Server.cpp
- reasoning: This is the core request-building logic `server::getModVersion` uses to resolve a mod's requested version into the actual index-server API call, which is how every mod install/update in Geode's mod browser fetches its target release.

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
        req.param("major", std::to_string(ver.major));
    },
    [&](ModVersionSpecific const& ver) {
        versionURL = ver.toNonVString();
    },
}, version);

auto response = co_await req.get(
    formatServerURL(
        "/mods/{}/versions/{}?gd={}&platforms={}",
        id,
        versionURL,
        Loader::get()->getGameVersion(),
        GEODE_PLATFORM_SHORT_IDENTIFIER
));
```

### Candidate 2

- file_path: loader/src/loader/ModMetadataImpl.cpp
- snippet_url: https://github.com/geode-sdk/geode/blob/main/loader/src/loader/ModMetadataImpl.cpp
- reasoning: This validates every mod's unique ID, but on close reading `foundDot` is only ever set to `true` on the branch that already returns `false`, so the "only one dot permitted" rule it claims to enforce never actually triggers.

```c
bool ModMetadata::validateID(std::string_view id) {
    // IDs may not be empty nor exceed 64 characters
    if (id.size() == 0 || id.size() > 64) {
        return false;
    }
    // Only one dot permitted
    bool foundDot = false;
    for (auto const& c : id) {
        if (!(
            ('a' <= c && c <= 'z') ||
            ('0' <= c && c <= '9') ||
            (c == '-' || c == '_') ||
            (c == '.' && !foundDot)
        )) {
            if (c == '.') {
                foundDot = true;
            }
            return false;
        }
    }
    return true;
}
```

### Candidate 3 (least important)

- file_path: loader/src/utils/hash.cpp
- snippet_url: https://github.com/geode-sdk/geode/blob/main/loader/src/utils/hash.cpp
- reasoning: A supporting utility that streams a file through OpenSSL's SHA-256 in fixed 4KB chunks rather than loading it whole, which is what lets Geode hash large mod packages cheaply for integrity/update checks.

```c
Result<Sha256> sha256File(std::filesystem::path const& path) {
    Sha256Hasher hasher;

    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        return Err("Failed to open file '{}' for reading", path);
    }

    uint8_t buf[4096];
    while (file.good()) {
        file.read(reinterpret_cast<char*>(buf), sizeof(buf));
        auto read = file.gcount();

        if (read > 0) {
            hasher.update(buf, read);
        }
    }

    return Ok(hasher.finish());
}
```

## Repo 2 — Fincept-Corporation/FinceptTerminal

### Candidate 1 (most important)

- file_path: fincept-qt/src/algo_engine/IndicatorEngine.cpp
- snippet_url: https://github.com/Fincept-Corporation/FinceptTerminal/blob/main/fincept-qt/src/algo_engine/IndicatorEngine.cpp
- reasoning: This is the Wilder-smoothed RSI calculation, the single most recognizable technical indicator in the algo-trading engine that is the whole point of this terminal, and its two-phase math rewards a close read.

```c
IndicatorResult IndicatorEngine::compute_rsi(
    const QVector<double>& close, int period) {
    int n = close.size();
    if (n < period + 1)
        return make_error(
            QStringLiteral("Insufficient data for RSI"));

    QVector<double> gains(n, 0), losses(n, 0);
    for (int i = 1; i < n; ++i) {
        double diff = close[i] - close[i - 1];
        if (diff > 0)
            gains[i] = diff;
        else
            losses[i] = -diff;
    }

    double avg_gain = 0, avg_loss = 0;
    for (int i = 1; i <= period; ++i) {
        avg_gain += gains[i];
        avg_loss += losses[i];
    }
    avg_gain /= period;
    avg_loss /= period;

    QVector<double> rsi_vals(
        n, std::numeric_limits<double>::quiet_NaN());
    auto calc_rsi = [](double ag, double al) -> double {
        if (al < 1e-10)
            return 100.0;
        return 100.0 - 100.0 / (1.0 + ag / al);
    };
    rsi_vals[period] = calc_rsi(avg_gain, avg_loss);

    for (int i = period + 1; i < n; ++i) {
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period;
        avg_loss =
            (avg_loss * (period - 1) + losses[i]) / period;
        rsi_vals[i] = calc_rsi(avg_gain, avg_loss);
    }

    double prev = (n >= 2 && !std::isnan(rsi_vals[n - 2]))
                      ? rsi_vals[n - 2]
                      : rsi_vals[n - 1];
    return make_result(rsi_vals[n - 1], prev);
}
```

### Candidate 2

- file_path: fincept-qt/src/algo_engine/CandleAggregator.cpp
- snippet_url: https://github.com/Fincept-Corporation/FinceptTerminal/blob/main/fincept-qt/src/algo_engine/CandleAggregator.cpp
- reasoning: This is the tick-to-candle aggregation routine that every indicator, scanner, and backtest in the engine ultimately consumes, so it's the foundational real-time data-pipeline logic for the whole algo stack.

```c
void CandleAggregator::on_tick(
    double price, double volume, int64_t timestamp_ms) {
    QMutexLocker lock(&mutex_);

    if (!has_first_tick_) {
        has_first_tick_ = true;
        int64_t candle_start = align_to_period(timestamp_ms);
        current_.open_time = candle_start;
        current_.close_time = candle_start + period_ms_;
        current_.open = price;
        current_.high = price;
        current_.low = price;
        current_.close = price;
        current_.volume = volume;
        current_.is_closed = false;
        return;
    }

    if (timestamp_ms >= current_.close_time) {
        close_current_and_open_new(timestamp_ms, price, volume);
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

### Candidate 3 (least important)

- file_path: fincept-qt/src/algo_engine/PositionManager.cpp
- snippet_url: https://github.com/Fincept-Corporation/FinceptTerminal/blob/main/fincept-qt/src/algo_engine/PositionManager.cpp
- reasoning: Realized-PnL bookkeeping and win-rate tracking on trade exit — important risk/accounting plumbing for the algo engine, but more mechanical than the indicator math or the data pipeline above it.

```c
double PositionManager::record_exit(
    double qty, double price, int64_t time_ms) {
    QMutexLocker lock(&mutex_);
    double pnl = 0;
    if (position_.side == PositionSide::Long)
        pnl = (price - position_.entry_price) * qty;
    else if (position_.side == PositionSide::Short)
        pnl = (position_.entry_price - price) * qty;

    metrics_.total_pnl += pnl;
    metrics_.total_trades++;
    if (pnl > 0)
        metrics_.winning_trades++;
    else if (pnl < 0)
        metrics_.losing_trades++;
    metrics_.win_rate = metrics_.total_trades > 0
        ? static_cast<double>(metrics_.winning_trades)
              / metrics_.total_trades * 100.0
        : 0;
    metrics_.last_trade_time = time_ms;

    risk_.daily_pnl += pnl;
    update_drawdown();
    latch_daily_loss_if_breached();

    position_.side = PositionSide::None;
    position_.quantity = 0;
    position_.entry_price = 0;
    position_.entry_time = 0;
    position_.unrealized_pnl = 0;

    return pnl;
}
```

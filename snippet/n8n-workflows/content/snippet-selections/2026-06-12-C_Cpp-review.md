# Breakdown Review — 2026-06-12 — C/C++

Issue: #18
Date: 2026-06-12
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — geo-tp/ESP32-Bit-Pirate

- file_path: src/Analyzers/PinAnalyzer.cpp
- snippet_url: https://github.com/geo-tp/ESP32-Bit-Pirate/blob/pioarduino/src/Analyzers/PinAnalyzer.cpp

file_intent: Digital signal timing quality analyzer
breakdown_what: Estimates the base clock period of a digital signal by taking the median of the bottom-quartile pulse measurements, then computes jitter as median absolute deviation expressed as a percentage of that reference period.
breakdown_responsibility: In ESP32-Bit-Pirate's pin analyzer, these functions run before protocol decoding to assess signal quality — a high jitter score flags noise or baud-rate mismatch rather than valid digital traffic, letting the tool abort before misinterpreting garbage as data.
breakdown_clever: `estimateBaseT` uses only the bottom quartile of pulse durations, not the full set — the assumption being that the true base clock is the shortest repeating unit, with longer pulses representing multi-bit encodings. Using the full-sample median would systematically overestimate the base period.
project_context: ESP32-Bit-Pirate is open-source firmware that turns any ESP32-S3 board into a multi-protocol hardware hacking tool, supporting I2C, SPI, UART, Sub-GHz, RFID, BLE, and more via a web-based CLI. Security researchers and hobbyists use it as a low-cost alternative to commercial tools like the Bus Pirate, with a one-click web flasher requiring no driver installation.

### Reformatted Snippet

```cpp
uint32_t PinAnalyzer::estimateBaseT(
    const std::vector<uint32_t>& pulses)
{
    if (pulses.size() < 10) return 0;

    std::vector<uint32_t> v = pulses;
    std::sort(v.begin(), v.end());
    size_t m = std::max<size_t>(8, v.size()/4);
    v.resize(m);
    return medianOf(v);
}

float PinAnalyzer::jitterScorePct(
    const std::vector<uint32_t>& pulses,
    uint32_t ref)
{
    if (pulses.size() < 10 || ref == 0)
        return 100.f;

    std::vector<uint32_t> dev;
    dev.reserve(pulses.size());
    for (auto p : pulses) {
        uint32_t d = (p > ref)
            ? (p - ref) : (ref - p);
        dev.push_back(d);
    }
    uint32_t mad = medianOf(dev);
    float pct = (100.0f * (float)mad) / (float)ref;
    if (pct < 0.f)   pct = 0.f;
    if (pct > 200.f) pct = 200.f;
    return pct;
}
```

## Repo 2 — leejet/stable-diffusion.cpp

- file_path: src/runtime/denoiser.hpp
- snippet_url: https://github.com/leejet/stable-diffusion.cpp/blob/master/src/runtime/denoiser.hpp

file_intent: Noise schedule timestep converter
breakdown_what: Converts a noise level sigma to a continuous diffusion timestep by computing log-sigma distances against the precomputed schedule, counting sign changes to find the insertion point, then linearly interpolating between the two bracketing entries.
breakdown_responsibility: In stable-diffusion.cpp's denoiser, `sigma_to_t` bridges the continuous noise schedule used by modern samplers and the integer timestep indices the model network expects — getting this mapping wrong would feed the UNet incorrect conditioning at every denoising step.
breakdown_clever: The insertion index is found by counting non-negative distances — a linear scan over the sorted `log_sigmas` array rather than a binary search. A true binary search would be O(log n) and avoid allocating the `dists` vector, but at 1000 timesteps the cost difference is negligible and the linear form makes the bracketing logic explicit.
project_context: stable-diffusion.cpp is a pure C/C++ inference engine for diffusion models — SD, Flux, Wan, and others — built on ggml with no Python dependency. Developers and hobbyists use it to run image generation locally on CPU, CUDA, Metal, and Vulkan without setting up a Python environment.

### Reformatted Snippet

```cpp
float sigma_to_t(float sigma) override {
    float log_sigma = std::log(sigma);
    std::vector<float> dists;
    dists.reserve(TIMESTEPS);
    for (float log_sigma_val : log_sigmas) {
        dists.push_back(log_sigma - log_sigma_val);
    }
    int low_idx = 0;
    for (size_t i = 0; i < TIMESTEPS; i++) {
        if (dists[i] >= 0) {
            low_idx++;
        }
    }
    low_idx = std::min(
        std::max(low_idx - 1, 0), TIMESTEPS - 2);
    int high_idx = low_idx + 1;
    float low  = log_sigmas[low_idx];
    float high = log_sigmas[high_idx];
    float w = (low - log_sigma) / (low - high);
    w = std::max(0.f, std::min(1.f, w));
    float t = (1.0f - w) * low_idx + w * high_idx;
    return t;
}
```

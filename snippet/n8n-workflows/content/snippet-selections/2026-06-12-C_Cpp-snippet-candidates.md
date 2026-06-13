# Snippet Candidates — 2026-06-12 — C_Cpp

Issue: #18
Date: 2026-06-12
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — geo-tp/ESP32-Bit-Pirate

### Candidate 1 (most important)

- file_path: src/Analyzers/SubGhzAnalyzer.cpp
- snippet_url: https://github.com/geo-tp/ESP32-Bit-Pirate/blob/pioarduino/src/Analyzers/SubGhzAnalyzer.cpp
- reasoning: This is the sub-GHz RF frame classifier's core heuristic — it runs 1D k-means to separate short and long OOK pulse widths, checks that the long/short ratio falls in the typical 1.45–3.6x range, and verifies that at least 70% of pulses cluster near one of the two centroids, which is the gating test that decides whether a captured signal is even decodable as OOK.

```cpp
bool SubGhzAnalyzer::looksPulseLength(
    float T,
    const std::vector<uint32_t>& highs,
    const std::vector<uint32_t>& lows,
    float& ratioOut)
{
    ratioOut = 0.f;
    if (highs.size() < 8 || lows.size() < 8)
        return false;

    std::vector<float> ds;
    ds.reserve(highs.size() + lows.size());
    for (auto d : highs) if (d >= 2) ds.push_back((float)d);
    for (auto d : lows)  if (d >= 2) ds.push_back((float)d);
    if (ds.size() < 16) return false;

    float vmin = ds[0], vmax = ds[0];
    for (float d : ds) {
        if (d < vmin) vmin = d;
        if (d > vmax) vmax = d;
    }

    float c1 = vmin, c2 = vmax;
    for (int it = 0; it < 8; ++it) {
        float s1 = 0.f, s2 = 0.f;
        int n1 = 0, n2 = 0;
        for (float d : ds) {
            if (std::fabs(d-c1) <= std::fabs(d-c2))
                { s1 += d; ++n1; }
            else
                { s2 += d; ++n2; }
        }
        if (n1 > 0) c1 = s1 / n1;
        if (n2 > 0) c2 = s2 / n2;
    }

    float S = (c1 < c2) ? c1 : c2;
    float L = (c1 < c2) ? c2 : c1;
    if (S <= 0.f || L <= 0.f) return false;

    float ratio = L / S;
    ratioOut = ratio;

    if (ratio < 1.45f || ratio > 3.60f) return false;

    const float tolS = 0.30f * S;
    const float tolL = 0.30f * L;
    int ok = 0;
    for (float d : ds) {
        bool nearS = (std::fabs(d - S) <= tolS);
        bool nearL = (std::fabs(d - L) <= tolL);
        if (nearS || nearL) ok++;
    }

    float coverage = ds.empty()
        ? 0.f
        : (float)ok / (float)ds.size();
    return coverage >= 0.70f;
}
```

### Candidate 2

- file_path: src/Analyzers/PinAnalyzer.cpp
- snippet_url: https://github.com/geo-tp/ESP32-Bit-Pirate/blob/pioarduino/src/Analyzers/PinAnalyzer.cpp
- reasoning: `estimateBaseT` and `jitterScorePct` together form the timing foundation of the pin signal classifier — extracting a base symbol period from the shortest pulse quartile and scoring deviation as a median-absolute-deviation percentage, which drives all downstream signal-type guesses (Clock, PWM, Data-like, Servo).

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

### Candidate 3 (least important)

- file_path: src/Analyzers/BinaryAnalyzer.cpp
- snippet_url: https://github.com/geo-tp/ESP32-Bit-Pirate/blob/pioarduino/src/Analyzers/BinaryAnalyzer.cpp
- reasoning: `analyzeBlock` computes Shannon entropy, printable-byte ratio, null/0xFF density, and file-signature detection on a raw memory block in a single pass — the building block that lets the tool scan SPI flash or SD card dumps to fingerprint firmware structure and spot embedded file systems, compressed images, or credentials.

```cpp
BinaryBlockStats BinaryAnalyzer::analyzeBlock(
    const uint8_t* buffer, size_t size)
{
    uint32_t printable = 0, nulls = 0,
             ff = 0, counts[256] = {0};
    float entropy = 0;

    for (size_t i = 0; i < size; ++i) {
        uint8_t b = buffer[i];
        counts[b]++;
        if (b >= 32 && b <= 126) printable++;
        if (b == 0x00) nulls++;
        if (b == 0xFF) ff++;
    }

    for (int i = 0; i < 256; ++i) {
        if (counts[i]) {
            float p = (float)counts[i] / size;
            entropy -= p * log2(p);
        }
    }

    return {
        entropy,
        printable,
        nulls,
        ff,
        detectFileSignature(buffer, size)
    };
}
```

## Repo 2 — leejet/stable-diffusion.cpp

### Candidate 1 (most important)

- file_path: src/runtime/denoiser.hpp
- snippet_url: https://github.com/leejet/stable-diffusion.cpp/blob/master/src/runtime/denoiser.hpp
- reasoning: This method converts a continuous noise level (sigma) back to a discrete timestep by binary-searching the log-sigma table and linearly interpolating — it is called on every denoising step and embodies how the scheduler bridges the continuous diffusion math to the discrete pretrained timestep grid.

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

### Candidate 2

- file_path: src/core/rng_philox.hpp
- snippet_url: https://github.com/leejet/stable-diffusion.cpp/blob/master/src/core/rng_philox.hpp
- reasoning: This implements the Philox 4×32 counter-based PRNG ported from PyTorch's CUDA kernel, making CPU-generated latents reproducible with the same seed as GPU runs — the `box_muller` transform then converts uniform 32-bit outputs to the Gaussian noise the diffusion process requires.

```cpp
void philox4_round(
    std::vector<std::vector<uint32_t>>& counter,
    const std::vector<std::vector<uint32_t>>& key) {
    uint32_t N = (uint32_t)counter[0].size();
    for (uint32_t i = 0; i < N; i++) {
        std::vector<uint32_t> v1 = uint32(
            (uint64_t)counter[0][i]
            * (uint64_t)philox_m[0]);
        std::vector<uint32_t> v2 = uint32(
            (uint64_t)counter[2][i]
            * (uint64_t)philox_m[1]);
        counter[0][i] = v2[1] ^ counter[1][i] ^ key[0][i];
        counter[1][i] = v2[0];
        counter[2][i] = v1[1] ^ counter[3][i] ^ key[1][i];
        counter[3][i] = v1[0];
    }
}

float box_muller(float x, float y) {
    float u = x * two_pow32_inv
              + two_pow32_inv / 2;
    float v = y * two_pow32_inv_2pi
              + two_pow32_inv_2pi / 2;
    float s = sqrt(-2.0f * log(u));
    return s * sin(v);
}
```

### Candidate 3 (least important)

- file_path: src/runtime/spectrum.hpp
- snippet_url: https://github.com/leejet/stable-diffusion.cpp/blob/master/src/runtime/spectrum.hpp
- reasoning: This `predict()` method implements a speculative denoising cache that fits a regularized Chebyshev polynomial via Cholesky-decomposed least squares across recent denoising history, letting the model skip steps by predicting what the network would have returned — an unusual but clever optimization not commonly seen in diffusion inference engines.

```cpp
void predict(sd::Tensor<float>* denoised) {
    GGML_ASSERT(denoised != nullptr);
    int64_t F   = (int64_t)H_buf[0].size();
    int K_curr  = (int)H_buf.size();
    int M1      = config.m + 1;
    float tau_at = taus(cnt);
    std::vector<float> X(K_curr * M1);
    for (int i = 0; i < K_curr; i++) {
        X[i * M1] = 1.0f;
        if (M1 > 1)
            X[i * M1 + 1] = T_buf[i];
        for (int j = 2; j < M1; j++)
            X[i * M1 + j] = 2.0f * T_buf[i]
                * X[i * M1 + j - 1]
                - X[i * M1 + j - 2];
    }
    std::vector<float> x_star(M1);
    x_star[0] = 1.0f;
    if (M1 > 1) x_star[1] = tau_at;
    for (int j = 2; j < M1; j++)
        x_star[j] = 2.0f * tau_at
            * x_star[j - 1] - x_star[j - 2];
    std::vector<float> XtX(M1 * M1, 0.0f);
    for (int i = 0; i < M1; i++)
        for (int j = 0; j < M1; j++) {
            float sum = 0.0f;
            for (int k = 0; k < K_curr; k++)
                sum += X[k*M1+i] * X[k*M1+j];
            XtX[i*M1+j] = sum
                + (i == j ? config.lam : 0.0f);
        }
    std::vector<float> L(M1 * M1, 0.0f);
    if (!cholesky_decompose(
            XtX.data(), L.data(), M1)) {
        float trace = 0.0f;
        for (int i = 0; i < M1; i++)
            trace += XtX[i * M1 + i];
        for (int i = 0; i < M1; i++)
            XtX[i*M1+i] += 1e-4f * trace / M1;
        cholesky_decompose(
            XtX.data(), L.data(), M1);
    }
    std::vector<float> v(M1);
    cholesky_solve(
        L.data(), x_star.data(), v.data(), M1);
    std::vector<float> weights(K_curr, 0.0f);
    for (int k = 0; k < K_curr; k++)
        for (int j = 0; j < M1; j++)
            weights[k] += X[k * M1 + j] * v[j];
    float* out   = denoised->data();
    float w_cheb = config.w;
    float w_taylor = 1.0f - w_cheb;
    const float* h_last = H_buf.back().data();
    const float* h_prev =
        H_buf[H_buf.size() - 2].data();
    for (int64_t f = 0; f < F; f++) {
        float pred_cheb = 0.0f;
        for (int k = 0; k < K_curr; k++)
            pred_cheb += weights[k] * H_buf[k][f];
        float pred_taylor = h_last[f]
            + 0.5f * (h_last[f] - h_prev[f]);
        out[f] = w_taylor * pred_taylor
               + w_cheb * pred_cheb;
    }
    num_cached++;
    total_steps_skipped++;
    cnt++;
}
```

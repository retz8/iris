# Breakdown Review — 2026-06-26 — C/C++

Issue: #20
Date: 2026-06-26
Language: C/C++
Status: COMPLETED

## Repo 1 — optiscaler/OptiScaler

- file_path: OptiScaler/upscalers/IFeature.h
- snippet_url: https://github.com/optiscaler/OptiScaler/blob/master/OptiScaler/upscalers/IFeature.h

file_intent: GPU upscaling feature polymorphic base
breakdown_what: Defines the abstract interface all upscaling backends implement: stores render/target/display resolution triplets, tracks jitter patterns via a custom hashed set, exposes runtime capability queries as pure virtuals, and provides frozen-frame detection logic.
breakdown_responsibility: All upscaling backends implement this interface, letting OptiScaler swap them through a single pointer at runtime — the resolution triplets and `GetUpscalerType()` virtual give the interception layer the geometry and identity it needs to redirect DLSS/FSR/XeSS API calls correctly.
breakdown_clever: Several upscalers require the game's full TAA jitter cycle before they converge to a stable output — `JitterCount()` exposes how many unique offsets have been seen. The custom hasher's `h1 ^ (h2 << 1)` avoids collisions when both coordinates are small floats.
project_context: An open-source middleware that lets PC gamers use any GPU upscaling or frame-generation backend (DLSS, FSR, XeSS) in games that only expose one — it works by intercepting upscaler API calls at runtime and redirecting them to the preferred backend, regardless of GPU brand.

### Reformatted Snippet

```cpp
struct InitFlags
{
    bool IsHdr;
    bool SharpenEnabled;
    bool LowResMV;
    bool AutoExposure;
    bool DepthInverted;
    bool JitteredMV;
};

class IFeature
{
  private:
    struct hashFunction
    {
        size_t operator()(
            const std::pair<float, float>& p) const
        {
            size_t h1 = std::hash<float>()(p.first);
            size_t h2 = std::hash<float>()(p.second);
            return h1 ^ (h2 << 1);
        }
    };

    std::unordered_set<
        std::pair<float, float>,
        hashFunction> _jitterInfo;

  protected:
    NVSDK_NGX_Handle* _handle = nullptr;
    unsigned int _renderWidth = 0;
    unsigned int _renderHeight = 0;
    unsigned int _targetWidth = 0;
    unsigned int _targetHeight = 0;
    unsigned int _displayWidth = 0;
    unsigned int _displayHeight = 0;
    long _frameCount = 0;
    bool _featureFrozen = false;

  public:
    static unsigned int GetNextHandleId()
    {
        return handleCounter++;
    }

    virtual bool IsWithDx12() = 0;
    virtual feature_version Version() = 0;
    virtual Upscaler GetUpscalerType() const = 0;

    virtual size_t JitterCount()
    {
        return _jitterInfo.size();
    }

    virtual void TickFrozenCheck();
    virtual bool IsFrozen() { return _featureFrozen; }
    virtual bool UpdateOutputResolution(
        const NVSDK_NGX_Parameter* InParameters);

    IFeature(
        unsigned int InHandleId,
        NVSDK_NGX_Parameter* InParameters)
    {
        SetHandle(InHandleId);
    }

    virtual ~IFeature() {}
};
```

## Repo 2 — NVIDIA-AI-Blueprints/video-search-and-summarization

- file_path: services/vios/src/modules/rtsp_server/H264ByteStreamSource.cpp
- snippet_url: https://github.com/NVIDIA-AI-Blueprints/video-search-and-summarization/blob/main/services/vios/src/modules/rtsp_server/H264ByteStreamSource.cpp

file_intent: H.264/H.265 continuation slice detector
breakdown_what: Determines whether a NAL unit represents a continuation slice (not the first in its frame) by parsing codec-specific slice header bits — the MSB of the post-header byte encodes `first_mb_in_slice` for H.264 and `first_slice_segment_in_pic_flag` for H.265.
breakdown_responsibility: In the RTSP server, this gates frame boundary detection: continuation slices append to the current packet group instead of triggering a new frame, which is essential for correctly streaming high-resolution video that splits a single frame across multiple NAL units.
breakdown_clever: The `& 0x80` check shortcuts Exp-Golomb decoding: value 0 always encodes as a leading `1`, so a leading `0` unambiguously means `first_mb_in_slice > 0` (H.264) or `first_slice_segment_in_pic_flag == 0` (H.265) — no variable-length decode needed, just one bitmask.
project_context: A GPU-accelerated reference architecture from NVIDIA for building AI video analytics agents that support natural-language video search, summarization, and visual Q&A — backed by vision-language models and NVIDIA NIM microservices, it targets enterprise use cases like smart-space monitoring, warehouse automation, and SOP validation.

### Reformatted Snippet

```cpp
bool isContinuationSlice(
    const std::vector<uint8_t> &content,
    uint8_t nal_type,
    const std::string &codec)
{
    if (iequals(codec, "h264"))
    {
        /* Only nal_unit_type 1 (non-IDR slice) and 5 (IDR
         * slice) are coded slices in H.264; anything else
         * cannot be a continuation. */
        if (nal_type != NaluType::kSlice
            && nal_type != NaluType::kIdr)
        {
            return false;
        }
        /* 1-byte NAL header + at least 1 slice-header byte. */
        if (content.size() < 2)
        {
            return false;
        }
        return (content[1] & 0x80) == 0;
    }
    if (iequals(codec, "h265"))
    {
        /* HEVC VCL NAL units are types 0..31; everything
         * 32+ is non-VCL (VPS/SPS/PPS/AUD/SEI/...). */
        if (nal_type > 31)
        {
            return false;
        }
        /* 2-byte NAL header + at least 1 slice-header byte. */
        if (content.size() < 3)
        {
            return false;
        }
        return (content[2] & 0x80) == 0;
    }
    return false;
}
```

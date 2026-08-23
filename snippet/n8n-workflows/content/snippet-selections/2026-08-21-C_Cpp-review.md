# Breakdown Review — 2026-08-21 — C/C++

Issue: #27
Date: 2026-08-21
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — deepseek-ai/3FS

- file_path: src/common/utils/LruCache.h
- snippet_url: https://github.com/deepseek-ai/3FS/blob/main/src/common/utils/LruCache.h

file_intent: LRU cache over-capacity evictor
breakdown_what: Removes exactly the number of excess entries needed to bring the cache back to capacity by erasing each tail entry from both the lookup map and the ordered list in a single linear pass. Returns the count of evicted entries.
breakdown_responsibility: Enforces the cache's memory bound in 3FS after batch insertions that temporarily exceed capacity — preventing the distributed file system's hot-data index from growing unbounded during high-throughput AI training bursts.
breakdown_clever: Computing `evictingSize` once before the loop is critical for correctness: `least_.size()` changes with every `pop_back()`, so re-reading it inside the loop would cause the eviction to stop short. The method works because the cache invariant guarantees `back()` is always the least-recently-used entry.
project_context: DeepSeek's 3FS (Fire-Flyer File System) is a high-performance distributed file system built for AI training and inference, achieving up to 6.6 TiB/s aggregate read bandwidth across production clusters. It uses RDMA over InfiniBand to let compute nodes access remote NVMe storage directly, making it the reference open-source implementation for distributed storage under large-scale LLM training pipelines.

### Reformatted Snippet

```cpp
size_t evictObsoleted() {
  if (least_.size() <= capacity_) {
    return 0;
  }
  auto evictingSize =
      least_.size() - capacity_;
  for (size_t i = 0; i < evictingSize; ++i) {
    used_.erase(back().first);
    least_.pop_back();
  }
  return evictingSize;
}
```

## Repo 2 — justcallmekoko/ESP32Marauder

- file_path: esp32_marauder/MarauderMacAddress.cpp
- snippet_url: https://github.com/justcallmekoko/ESP32Marauder/blob/master/esp32_marauder/MarauderMacAddress.cpp

file_intent: MAC address hex formatter
breakdown_what: Converts a 6-byte MAC address into a null-terminated `AA:BB:CC:DD:EE:FF` string using a pre-built hex digit lookup table, writing directly into a caller-provided output buffer without heap allocation.
breakdown_responsibility: Produces the human-readable MAC string used throughout ESP32Marauder's WiFi scan results — every access point and BLE device the firmware detects and logs passes through this function.
breakdown_clever: Nibble extraction via `>> 4` and `& 0x0F` beats `sprintf` with zero allocation. The stride `index * 3` covers both hex chars and colons in one pass. Conditionally omitting the colon only at the last byte prevents a trailing separator without branching outside the loop.
project_context: ESP32Marauder is an open-source WiFi and Bluetooth security testing toolkit that runs on the ESP32 microcontroller. Security researchers and penetration testers flash it onto commodity hardware to perform 802.11 auditing, deauthentication testing, and BLE device scanning in the field without carrying full-sized equipment.

### Reformatted Snippet

```cpp
bool formatMacAddress(
    const uint8_t mac[kMacAddressSize],
    char output[kMacAddressTextLength + 1]) {
  if (mac == nullptr || output == nullptr) {
    return false;
  }
  for (size_t index = 0;
       index < kMacAddressSize; ++index) {
    const size_t offset = index * 3;
    output[offset] =
        kHexDigits[(mac[index] >> 4) & 0x0F];
    output[offset + 1] =
        kHexDigits[mac[index] & 0x0F];
    if (index + 1 < kMacAddressSize) {
      output[offset + 2] = ':';
    }
  }
  output[kMacAddressTextLength] = '\0';
  return true;
}
```

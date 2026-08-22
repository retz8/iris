# Snippet Candidates — 2026-08-21 — C_Cpp

Issue: #27
Date: 2026-08-21
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — deepseek-ai/3FS

### Candidate 1 (most important)

- file_path: src/storage/aio/BatchReadJob.cc
- snippet_url: https://github.com/deepseek-ai/3FS/blob/main/src/storage/aio/BatchReadJob.cc
- reasoning: This is the synchronization point for batch AIO completions — the last-job detector that records end-to-end batch latency and posts the baton that wakes the requester, making it the linchpin of 3FS's core high-throughput read path.

```cpp
void BatchReadJob::finish(AioReadJob *job) {
  (void)job;
  if (++finishedCount_ == jobs_.size()) {
    batchReadLatency.addSample(
        RelativeTime::now() - startTime());
    baton_.post();
  }
}
```

### Candidate 2

- file_path: src/common/net/Waiter.cc
- snippet_url: https://github.com/deepseek-ai/3FS/blob/main/src/common/net/Waiter.cc
- reasoning: The sharded timer's drain-and-reset operation — it atomically transfers one shard's pending tasks to the processor's accumulator and resets `nearestRunTime_` to infinity, which is how the timer thread knows to block indefinitely until new work arrives.

```cpp
void Waiter::TaskShard::exchangeTasks(
    std::vector<Task> &out) {
  std::unique_lock lock(mutex_);
  if (!tasks_.empty()) {
    out.swap(tasks_);
    nearestRunTime_ =
        std::numeric_limits<int64_t>::max();
  }
}
```

### Candidate 3 (least important)

- file_path: src/common/utils/LruCache.h
- snippet_url: https://github.com/deepseek-ai/3FS/blob/main/src/common/utils/LruCache.h
- reasoning: The eviction sweep that keeps the two-tier backend cache bounded — it erases from both the doubly-linked list tail and the companion hash map in lock-step, revealing the structural coupling that makes O(1) LRU eviction possible.

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

### Candidate 1 (most important)

- file_path: esp32_marauder/PcapHeader.cpp
- snippet_url: https://github.com/justcallmekoko/ESP32Marauder/blob/master/esp32_marauder/PcapHeader.cpp
- reasoning: This is the binary serialization layer that makes captured 802.11 frames readable by Wireshark — it hand-encodes the PCAP global header byte-by-byte using portable bit-shifting rather than platform-dependent struct packing, and the hardcoded link type 105 (IEEE 802.11) pins the capture format to raw WiFi frames.

```cpp
namespace marauder {
namespace {

void writeLittleEndian16(
    uint16_t value, uint8_t* output) {
  output[0] = static_cast<uint8_t>(value);
  output[1] = static_cast<uint8_t>(value >> 8);
}

void writeLittleEndian32(
    uint32_t value, uint8_t* output) {
  output[0] = static_cast<uint8_t>(value);
  output[1] = static_cast<uint8_t>(value >> 8);
  output[2] = static_cast<uint8_t>(value >> 16);
  output[3] = static_cast<uint8_t>(value >> 24);
}

}  // namespace

void makePcapGlobalHeader(
    uint32_t snapshot_length,
    uint8_t output[kPcapGlobalHeaderSize]) {
  writeLittleEndian32(0xa1b2c3d4, output);
  writeLittleEndian16(2, output + 4);
  writeLittleEndian16(4, output + 6);
  writeLittleEndian32(0, output + 8);
  writeLittleEndian32(0, output + 12);
  writeLittleEndian32(snapshot_length, output + 16);
  writeLittleEndian32(105, output + 20);
}

}  // namespace marauder
```

### Candidate 2

- file_path: esp32_marauder/MarauderMacAddress.cpp
- snippet_url: https://github.com/justcallmekoko/ESP32Marauder/blob/master/esp32_marauder/MarauderMacAddress.cpp
- reasoning: This function renders a MAC address to text without sprintf or dynamic allocation — it uses a compile-time hex digit table and manual stride arithmetic (`index * 3`) that maps each byte to two hex characters plus a colon, a pattern common in embedded code where format strings carry too much overhead.

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

### Candidate 3 (least important)

- file_path: esp32_marauder/BeaconFrame.cpp
- snippet_url: https://github.com/justcallmekoko/ESP32Marauder/blob/master/esp32_marauder/BeaconFrame.cpp
- reasoning: The magic offset `50 + ssid_length` encodes knowledge of the 802.11 beacon frame wire layout — the DS Parameter Set IE always sits immediately after the variable-length SSID field — and the function's bounds check before the raw write shows the defensive style needed when crafting frames for injection.

```cpp
bool setBeaconFrameChannel(
  uint8_t* frame,
  size_t frame_size,
  size_t ssid_length,
  uint8_t channel
) {
  const size_t channel_index =
      50 + ssid_length;
  if ((frame == nullptr) ||
      (channel_index >= frame_size))
    return false;

  frame[channel_index] = channel;
  return true;
}
```

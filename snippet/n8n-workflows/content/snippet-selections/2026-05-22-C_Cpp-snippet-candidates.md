# Snippet Candidates — 2026-05-22 — C_Cpp

Issue: #15
Date: 2026-05-22
Language: C_Cpp
Status: COMPLETED

## Repo 1 — lemonade-sdk/lemonade

### Candidate 1 (most important)

- file_path: src/cpp/server/router.cpp
- snippet_url: https://github.com/lemonade-sdk/lemonade/blob/main/src/cpp/server/router.cpp
- reasoning: This is the heart of the server's multi-model orchestration — it serializes concurrent loads, enforces NPU exclusivity rules per recipe type (FLM coexists up to 3, RyzenAI/WhisperCpp are exclusive), runs LRU eviction, releases the mutex before a slow 30-60s backend startup, and falls back to a full "nuclear" eviction-and-retry on non-file errors.

```cpp
// Serialize concurrent model loads
std::unique_lock<std::mutex> lock(load_mutex_);
while (is_loading_) {
    load_cv_.wait(lock);
}
is_loading_ = true;

// NPU exclusivity: ryzenai-llm and whispercpp
// cannot coexist with any other NPU model.
if (device_type & DEVICE_NPU) {
    if (model_info.recipe == "ryzenai-llm" ||
        model_info.recipe == "whispercpp") {
        if (has_npu_server()) {
            evict_all_npu_servers();
        }
    } else if (model_info.recipe == "flm") {
        for (const std::string& excl :
             {"ryzenai-llm", "whispercpp"}) {
            WrappedServer* s =
                find_npu_server_by_recipe(excl);
            if (s) evict_server(s);
        }
        WrappedServer* same =
            find_flm_server_by_type(model_type);
        if (same) evict_server(same);
    } else {
        if (has_npu_server())
            evict_all_npu_servers();
    }
}

// LRU eviction when at capacity
int cur = count_servers_by_type(model_type);
if (max_models != -1 && cur >= max_models) {
    WrappedServer* lru =
        find_lru_server_by_type(model_type);
    if (lru) evict_server(lru);
}

// Release lock before slow backend startup
// (can take 30-60s for NPU backends).
lock.unlock();

bool load_success = false;
try {
    new_server->load(
        canonical_model_name,
        model_info,
        effective_options,
        do_not_upgrade);
    load_success = true;
} catch (const std::exception& e) {
    error_message = e.what();
}

lock.lock();

if (!load_success) {
    bool is_fnf =
        error_message.find("not found")
            != std::string::npos ||
        error_message.find("No such file")
            != std::string::npos;

    is_loading_ = false;
    load_cv_.notify_all();

    if (is_fnf)
        throw std::runtime_error(error_message);

    // Nuclear option: evict everything and retry
    // once before propagating the error.
    evict_all_servers();
    is_loading_ = true;
    lock.unlock();
    retry_server->load(
        canonical_model_name,
        model_info,
        effective_options,
        do_not_upgrade);
    lock.lock();
    loaded_servers_.push_back(
        std::move(retry_server));
    is_loading_ = false;
    load_cv_.notify_all();
}
```

### Candidate 2

- file_path: src/cpp/server/model_manager.cpp
- snippet_url: https://github.com/lemonade-sdk/lemonade/blob/main/src/cpp/server/model_manager.cpp
- reasoning: This function parses GGUF binary metadata without loading the full model — it handles the tricky case where `general.architecture` may appear after the context-length key by buffering a `pending_context_length` and returning it retroactively, making the single-pass scan order-independent.

```cpp
static int64_t read_gguf_context_length(
    const std::string& path) {
    std::ifstream in(
        path_from_utf8(path), std::ios::binary);
    if (!in) return 0;

    char magic[4] = {};
    in.read(magic, sizeof(magic));
    if (!in || std::memcmp(magic, "GGUF", 4) != 0)
        return 0;

    uint32_t version = 0;
    uint64_t tensor_count = 0;
    uint64_t kv_count = 0;
    if (!read_le(in, version)        ||
        !read_le(in, tensor_count)   ||
        !read_le(in, kv_count)) return 0;
    (void)version; (void)tensor_count;

    std::string architecture;
    int64_t pending_context_length = 0;

    for (uint64_t i = 0; i < kv_count; ++i) {
        std::string key;
        uint32_t type = 0;
        if (!read_gguf_string(in, key) ||
            !read_le(in, type)) return 0;

        if (key == "general.architecture"
                && type == 8) {
            if (!read_gguf_string(
                    in, architecture)) return 0;
            if (pending_context_length > 0)
                return pending_context_length;
            continue;
        }

        const bool context_key =
            !architecture.empty() &&
            key == architecture + ".context_length";
        const bool possible_context_key =
            architecture.empty() &&
            key.size() >
                std::strlen(".context_length") &&
            ends_with_ignore_case(
                key, ".context_length");

        if (context_key || possible_context_key) {
            int64_t value = 0;
            if (!read_gguf_integer_value(
                    in, type, value)) return 0;
            if (value <= 0) return 0;
            if (context_key) return value;
            pending_context_length = value;
            continue;
        }

        if (!skip_gguf_value(in, type)) return 0;
    }

    return pending_context_length;
}
```

### Candidate 3 (least important)

- file_path: src/cpp/server/vad.cpp
- snippet_url: https://github.com/lemonade-sdk/lemonade/blob/main/src/cpp/server/vad.cpp
- reasoning: This implements a two-state (silent/speech) voice activity detector using RMS energy thresholds with onset confirmation and hangover buffering — the interplay of `onset_counter_`, `hangover_counter_`, and `silence_frames_` requires careful reading to understand how spurious noise and trailing silence are handled.

```cpp
SimpleVAD::Event SimpleVAD::process(
    const std::vector<float>& audio,
    int sample_rate) {
    if (audio.empty()) return Event::None;

    float rms = calculate_rms(audio);
    bool is_voice =
        rms > config_.energy_threshold;
    float frame_ms =
        static_cast<float>(audio.size())
        * 1000.0f
        / static_cast<float>(sample_rate);

    Event result = Event::None;

    if (!speech_active_) {
        if (is_voice) {
            onset_counter_++;
            speech_frames_++;
            float speech_ms =
                speech_frames_ * frame_ms;
            if (onset_counter_ >=
                    config_.onset_frames &&
                speech_ms >=
                    config_.min_speech_ms) {
                speech_active_ = true;
                hangover_counter_ =
                    config_.hangover_frames;
                speech_start_ms_ =
                    current_time_ms() -
                    static_cast<int64_t>(speech_ms);
                result = Event::SpeechStart;
            }
        } else {
            onset_counter_ = 0;
            speech_frames_ = 0;
            silence_frames_ = 0;
        }
    } else {
        if (is_voice) {
            hangover_counter_ =
                config_.hangover_frames;
            silence_frames_ = 0;
            speech_frames_++;
        } else {
            if (hangover_counter_ > 0) {
                hangover_counter_--;
            } else {
                silence_frames_++;
                float sil_ms =
                    silence_frames_ * frame_ms;
                if (sil_ms >=
                        config_.min_silence_ms) {
                    speech_active_ = false;
                    speech_end_ms_ =
                        current_time_ms();
                    onset_counter_ = 0;
                    speech_frames_ = 0;
                    silence_frames_ = 0;
                    result = Event::SpeechEnd;
                }
            }
        }
    }

    return result;
}
```

## Repo 2 — 78/xiaozhi-esp32

### Candidate 1 (most important)

- file_path: main/device_state_machine.cc
- snippet_url: https://github.com/78/xiaozhi-esp32/blob/main/main/device_state_machine.cc
- reasoning: This is the central behavioral contract of the device — every valid lifecycle transition (boot → wifi → idle → listen → speak → error) is encoded here, and any invalid hop is logged and rejected, making this the authoritative source of how the device behaves end-to-end.

```cpp
bool DeviceStateMachine::IsValidTransition(
    DeviceState from, DeviceState to) const {
  if (from == to) return true;
  switch (from) {
    case kDeviceStateUnknown:
      return to == kDeviceStateStarting;
    case kDeviceStateStarting:
      return to == kDeviceStateWifiConfiguring ||
             to == kDeviceStateActivating;
    case kDeviceStateWifiConfiguring:
      return to == kDeviceStateActivating ||
             to == kDeviceStateAudioTesting;
    case kDeviceStateAudioTesting:
      return to == kDeviceStateWifiConfiguring;
    case kDeviceStateActivating:
      return to == kDeviceStateUpgrading ||
             to == kDeviceStateIdle ||
             to == kDeviceStateWifiConfiguring;
    case kDeviceStateUpgrading:
      return to == kDeviceStateIdle ||
             to == kDeviceStateActivating;
    case kDeviceStateIdle:
      return to == kDeviceStateConnecting ||
             to == kDeviceStateListening ||
             to == kDeviceStateSpeaking ||
             to == kDeviceStateActivating ||
             to == kDeviceStateUpgrading ||
             to == kDeviceStateWifiConfiguring;
    case kDeviceStateConnecting:
      return to == kDeviceStateIdle ||
             to == kDeviceStateListening;
    case kDeviceStateListening:
      return to == kDeviceStateSpeaking ||
             to == kDeviceStateIdle;
    case kDeviceStateSpeaking:
      return to == kDeviceStateListening ||
             to == kDeviceStateIdle;
    case kDeviceStateFatalError:
      return false;
    default:
      return false;
  }
}
```

### Candidate 2

- file_path: main/audio/audio_service.cc
- snippet_url: https://github.com/78/xiaozhi-esp32/blob/main/main/audio/audio_service.cc
- reasoning: The `AudioInputTask` shows how the device multiplexes a single microphone stream across three competing consumers — audio testing, wake-word detection, and the voice processor — using FreeRTOS event bits as a bitmask dispatch, a pattern that reveals the real-time scheduling design at the heart of the voice assistant.

```cpp
void AudioService::AudioInputTask() {
  while (true) {
    EventBits_t bits = xEventGroupWaitBits(
      event_group_,
      AS_EVENT_AUDIO_TESTING_RUNNING |
      AS_EVENT_WAKE_WORD_RUNNING |
      AS_EVENT_AUDIO_PROCESSOR_RUNNING,
      pdFALSE, pdFALSE, portMAX_DELAY);

    if (service_stopped_) break;

    if (audio_input_need_warmup_) {
      audio_input_need_warmup_ = false;
      vTaskDelay(pdMS_TO_TICKS(120));
      continue;
    }

    if (bits & AS_EVENT_AUDIO_TESTING_RUNNING) {
      int max = AUDIO_TESTING_MAX_DURATION_MS
                / OPUS_FRAME_DURATION_MS;
      if (audio_testing_queue_.size() >= max) {
        EnableAudioTesting(false);
        continue;
      }
      int samples =
        OPUS_FRAME_DURATION_MS * 16000 / 1000;
      std::vector<int16_t> data;
      if (ReadAudioData(data, 16000, samples)) {
        PushTaskToEncodeQueue(
          kAudioTaskTypeEncodeToTestingQueue,
          std::move(data));
        continue;
      }
    }

    if (bits & (AS_EVENT_WAKE_WORD_RUNNING |
                AS_EVENT_AUDIO_PROCESSOR_RUNNING)) {
      std::vector<int16_t> data;
      if (ReadAudioData(data, 16000, 160)) {
        if (bits & AS_EVENT_WAKE_WORD_RUNNING)
          wake_word_->Feed(data);
        if (bits & AS_EVENT_AUDIO_PROCESSOR_RUNNING)
          audio_processor_->Feed(std::move(data));
        continue;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
```

### Candidate 3 (least important)

- file_path: main/device_state_machine.cc
- snippet_url: https://github.com/78/xiaozhi-esp32/blob/main/main/device_state_machine.cc
- reasoning: `TransitionTo` shows how the state machine atomically commits a state change — loading via `std::atomic`, validating, storing, logging with ESP-IDF, and then fanning out to observers — a compact example of thread-safe state mutation with observer notification on an embedded target.

```cpp
bool DeviceStateMachine::TransitionTo(
    DeviceState new_state) {
  DeviceState old_state =
      current_state_.load();

  if (old_state == new_state) return true;

  if (!IsValidTransition(old_state, new_state)) {
    ESP_LOGW(TAG,
      "Invalid state transition: %s -> %s",
      GetStateName(old_state),
      GetStateName(new_state));
    return false;
  }

  current_state_.store(new_state);
  ESP_LOGI(TAG, "State: %s -> %s",
    GetStateName(old_state),
    GetStateName(new_state));

  NotifyStateChange(old_state, new_state);
  return true;
}
```

# Breakdown Review — 2026-05-22 — C/C++

Issue: #15
Date: 2026-05-22
Language: C/C++
Status: COMPLETED

## Repo 1 — lemonade-sdk/lemonade

- file_path: src/cpp/server/router.cpp
- snippet_url: https://github.com/lemonade-sdk/lemonade/blob/main/src/cpp/server/router.cpp

file_intent: Model server eviction and load coordinator
breakdown_what: Acquires a load mutex, applies recipe-specific NPU eviction rules and server caps, releases the lock to load the model outside the critical section, then re-acquires to confirm success or evict all servers and retry with a fallback.
breakdown_responsibility: Manages the NPU/GPU server lifecycle in Lemonade's model router, ensuring hardware resources aren't double-allocated across incompatible recipes (ryzenai-llm, whispercpp, flm) while allowing concurrent inference on already-loaded models to proceed unblocked.
breakdown_clever: The mutex is released before `new_server->load()` because model loading takes seconds — holding the lock would block all concurrent requests. The re-acquire after load ensures safe writes, while the retry path evicts all servers first to guarantee a clean state before the second attempt.
project_context: Lemonade is an AMD-backed open-source local AI server that routes text, speech, and image inference across NPU, GPU, and CPU backends on Ryzen AI hardware. It's used by developers who want an OpenAI-compatible local endpoint that automatically picks the optimal hardware backend without manual configuration.

### Reformatted Snippet

```cpp
std::unique_lock<std::mutex> lock(load_mutex_);
while (is_loading_) {
    load_cv_.wait(lock);
}
is_loading_ = true;

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

int cur = count_servers_by_type(model_type);
if (max_models != -1 && cur >= max_models) {
    WrappedServer* lru =
        find_lru_server_by_type(model_type);
    if (lru) evict_server(lru);
}

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

## Repo 2 — 78/xiaozhi-esp32

- file_path: main/audio/audio_service.cc
- snippet_url: https://github.com/78/xiaozhi-esp32/blob/main/main/audio/audio_service.cc

file_intent: FreeRTOS audio capture dispatch loop
breakdown_what: Runs a FreeRTOS task that blocks on an event group until an audio mode activates, then routes captured PCM frames to the appropriate consumer — test encode queue, wake-word detector, or audio processor — with a 120ms warmup on first activation.
breakdown_responsibility: Serves as the single audio input demultiplexer for the ESP32 device, separating test recording, wake-word detection, and streaming ASR paths without duplicating the hardware read call — keeping the mic abstraction clean for all three consumers.
breakdown_clever: The branch priority is semantically significant: audio testing gets first pick and always continues, so test frames are never accidentally fed to the wake-word or LLM paths during recording — a silent safety gate on a device with no UI to surface unexpected behavior.
project_context: xiaozhi-esp32 is a Chinese open-source project that turns ESP32 microcontrollers into voice AI chatbots connected to LLMs like Qwen and DeepSeek via MCP protocol. It's popular in the maker community for building low-cost physical AI assistants with smart home control and multilingual voice interaction.

### Reformatted Snippet

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

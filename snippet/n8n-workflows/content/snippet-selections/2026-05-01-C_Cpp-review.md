# Breakdown Review — 2026-05-01 — C/C++

Issue: #12
Date: 2026-05-01
Language: C/C++
Status: COMPLETED

## Repo 1 — FastFlowLM/FastFlowLM

- file_path: src/include/prompt_cache.hpp
- snippet_url: https://github.com/FastFlowLM/FastFlowLM/blob/main/src/include/prompt_cache.hpp

file_intent: Prompt prefix cache validity checker
breakdown_what: Computes two rolling checksums over the message history — one over all messages except the last two, one over all messages — then returns true only if the stable prefix checksum matches the stored value from the previous call.
breakdown_responsibility: Decides whether FastFlowLM can reuse the KV cache from the previous inference, skipping prefix recomputation and enabling the runtime's claimed token efficiency — a new user turn only invalidates the cache if any earlier message in the conversation changed.
breakdown_clever: Tool messages and tool-call frames are excluded from the checksum unless the template is `harmony` — meaning repeated tool calls with different return values won't bust the cache in default mode, silently reusing a prefix that may contain stale tool output.
project_context: FastFlowLM is an Ollama-style LLM runtime purpose-built for AMD Ryzen AI NPUs — no GPU required — running models at up to 89 tokens/second with 10× the power efficiency of GPU inference and 256k context support. Laptop and mini-PC owners with AMD Ryzen AI chips use it to run local LLMs without the heat or power draw of a dedicated GPU.

### Reformatted Snippet

```cpp
bool can_use_cache(
    json& messages,
    chat_template_type_t template_type)
{
  uint64_t check_sum_to_compare = 0;
  uint64_t new_checksum = 0;

  if (messages.size() > 2) {
    for (size_t i = 0; i < messages.size(); ++i) {
      const auto& msg = messages[i];
      const std::string role =
          msg.value("role", "");
      const std::string content =
          msg.value("content", "");
      bool has_tool_call =
          msg.contains("tool_calls");
      bool skip_this_message =
          (role == "tool") || has_tool_call;

      if (template_type ==
          chat_template_type_t::harmony) {
        skip_this_message = false;
      }

      if (skip_this_message) continue;

      if (i < messages.size() - 2)
        check_sum_to_compare =
          _calculate_checksum(
            content.data(),
            content.size(),
            check_sum_to_compare);

      new_checksum = _calculate_checksum(
          content.data(),
          content.size(),
          new_checksum);
    }

    if (checksum_ == check_sum_to_compare) {
      checksum_ = new_checksum;
      return true;
    } else {
      checksum_ = new_checksum;
      return false;
    }
  } else {
    return false;
  }
}
```

## Repo 2 — dorianborian/sesame-robot

- file_path: firmware/movement-sequences.h
- snippet_url: https://github.com/dorianborian/sesame-robot/blob/main/firmware/movement-sequences.h

file_intent: Quadruped forward walk gait sequence
breakdown_what: Drives all eight leg servos through a timed forward-walk cycle — setting each servo to a specific angle per gait frame, with a `pressingCheck` call between every frame that aborts the entire sequence if the forward input stops.
breakdown_responsibility: Encodes the physical walking gait as a choreographed sequence of servo positions for Sesame's four legs — each call moves a specific joint, and the overall interleaved pattern implements a trotting stride that lifts diagonal leg pairs in alternation.
breakdown_clever: Every `pressingCheck` fires between individual servo-angle assignments rather than between full cycles — so if the user releases the forward button mid-stride, the gait halts at the nearest frame boundary rather than finishing the cycle, keeping the robot's pose from landing in an unstable intermediate state.
project_context: Sesame is an open-source mini quadruped robot built on an ESP32 with eight servos, 3D-printed parts, WiFi control, and a total build cost around $60. Hobbyists and robotics learners use it as an affordable entry point for hands-on servo control, gait programming, and physical robotics experimentation.

### Reformatted Snippet

```c
inline void runWalkPose() {
  Serial.println(F("WALK FWD"));
  setFaceWithMode("walk", FACE_ANIM_ONCE);
  setServoAngle(R3, 135); setServoAngle(L3, 45);
  setServoAngle(R2, 100); setServoAngle(L1, 25);
  if (!pressingCheck("forward", frameDelay)) return;

  for (int i = 0; i < walkCycles; i++) {
    setServoAngle(R3, 135); setServoAngle(L3, 0);
    if (!pressingCheck("forward", frameDelay)) return;
    setServoAngle(L4, 135); setServoAngle(L2, 90);
    setServoAngle(R4, 0); setServoAngle(R1, 180);
    if (!pressingCheck("forward", frameDelay)) return;
    setServoAngle(R2, 45); setServoAngle(L1, 90);
    if (!pressingCheck("forward", frameDelay)) return;
    setServoAngle(R4, 45); setServoAngle(L4, 180);
    if (!pressingCheck("forward", frameDelay)) return;
    setServoAngle(R3, 180); setServoAngle(L3, 45);
    setServoAngle(R2, 90); setServoAngle(L1, 0);
    if (!pressingCheck("forward", frameDelay)) return;
    setServoAngle(L2, 135); setServoAngle(R1, 90);
    if (!pressingCheck("forward", frameDelay)) return;
  }
  runStandPose(1);
}
```

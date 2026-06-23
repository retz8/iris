# Breakdown Review — 2026-06-19 — C/C++

Issue: #19
Date: 2026-06-19
Language: C/C++
Status: COMPLETED

## Repo 1 — ocornut/imgui

- file_path: misc/cpp/imgui_stdlib.cpp
- snippet_url: https://github.com/ocornut/imgui/blob/master/misc/cpp/imgui_stdlib.cpp

file_intent: std::string resize adapter for InputText widget
breakdown_what: Handles imgui's resize event by growing the backing `std::string` to the requested buffer size and re-pointing imgui's internal buffer pointer at the new allocation; also chains to a secondary user callback if one was registered.
breakdown_responsibility: Bridges imgui's fixed C-string model to dynamic `std::string` — without this adapter, InputText widgets can't grow past their initial allocation, causing any text input that exceeds the starting buffer size to silently truncate.
breakdown_clever: After `str->resize`, the line `data->Buf = (char*)str->c_str()` re-points imgui's buffer at the reallocated string data. This is essential: `resize` may relocate the string's memory (heap realloc or SSO threshold crossing), invalidating the pointer imgui held when the callback was invoked. Skipping the re-point causes imgui to write into freed memory on the next keystroke.
project_context: Dear ImGui is a bloat-free immediate-mode C++ GUI library used across game engines, in-engine dev tools, and standalone debuggers — the `misc/cpp/` folder provides optional STL integration helpers for codebases that need `std::string` support without pulling in the full stdlib.

### Reformatted Snippet

```cpp
static int InputTextCallback(
    ImGuiInputTextCallbackData* data)
{
    InputTextCallback_UserData* user_data =
        (InputTextCallback_UserData*)data->UserData;
    if (data->EventFlag ==
        ImGuiInputTextFlags_CallbackResize)
    {
        std::string* str = user_data->Str;
        IM_ASSERT(data->Buf == str->c_str());
        str->resize(data->BufTextLen);
        data->Buf = (char*)str->c_str();
    }
    else if (user_data->ChainCallback)
    {
        data->UserData =
            user_data->ChainCallbackUserData;
        return user_data->ChainCallback(data);
    }
    return 0;
}
```

## Repo 2 — EpicGames/raddebugger

- file_path: src/base/base_core.c
- snippet_url: https://github.com/EpicGames/raddebugger/blob/master/src/base/base_core.c

file_intent: Zero-byte position finder with SIMD and SWAR paths
breakdown_what: Finds the first zero byte in an 8-byte buffer using SSE2 byte-compare and bitmask extraction on x64, falling back on other architectures to a portable SWAR formula that sets a flag bit in every zero byte simultaneously before extracting the lowest one.
breakdown_responsibility: Provides fast null-terminator scanning for the debugger's string utilities — in a tool that processes thousands of symbol names per second during live debugging, replacing a byte-by-byte loop with a single SIMD or SWAR word-scan is a performance-critical primitive.
breakdown_clever: The SWAR formula exploits byte underflow: subtracting 1 from a zero byte produces 0xFF (setting its high bit), while `~x & mask_msb` admits only bytes whose original high bit was clear — the intersection isolates zero bytes exclusively without a branch. `ctz64(t) / 8` then maps the bit position to a byte index in one division, matching the SSE2 path's interface.
project_context: The RAD Debugger is a native multi-process graphical debugger from Epic Games written in pure C, designed as a performance-focused and clean-codebase alternative to WinDbg — it targets Windows x64 game and engine development workflows.

### Reformatted Snippet

```c
internal U32
idx_of_zero_byte64(U8 *ptr, U64 size)
{
  Assert(size == 8);
#if ARCH_X64
  __m128i v = _mm_loadl_epi64((__m128i*)ptr);
  __m128i m = _mm_cmpeq_epi8(v, _mm_setzero_si128());
  U32 bits = _mm_movemask_epi8(m);
  return ctz32(bits);
#else
  U64 x;
  MemoryCopyStruct(&x, ptr);
  U64 splat    = ~0ULL / 255;
  U64 mask_lsb = 0x01 * splat;
  U64 mask_msb = 0x80 * splat;
  U64 t = (x - mask_lsb) & (~x & mask_msb);
  return ctz64(t) / 8;
#endif
}
```

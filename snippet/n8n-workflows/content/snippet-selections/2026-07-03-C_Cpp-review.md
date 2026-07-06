# Breakdown Review — 2026-07-03 — C/C++

Issue: #21
Date: 2026-07-03
Language: C/C++
Status: COMPLETED

## Repo 1 — shadps4-emu/shadPS4

- file_path: src/core/aerolib/stubs.cpp
- snippet_url: https://github.com/shadps4-emu/shadPS4/blob/main/src/core/aerolib/stubs.cpp

file_intent: PS4 unimplemented syscall stub allocator
breakdown_what: Allocates a stub handler for a PS4 system function by NID — recording it as known or unknown in the corresponding tracking array, then returning a type-erased pointer to the pre-allocated handler at that slot.
breakdown_responsibility: Provides safe fallbacks for PS4 system calls the emulator hasn't implemented — each game can invoke unresolved functions without crashing, while the recorded NID lists give developers a prioritized roadmap of what still needs real implementation.
breakdown_clever: `stub_handlers[UsedStubEntries++]` post-increments after indexing, so each call claims a unique slot from a pre-allocated array without any dynamic allocation — the returned address stays valid for the emulator session because no reallocation can occur.
project_context: shadPS4 is a free, open-source PlayStation 4 emulator written in C++ that runs PS4 titles on Windows, Linux, macOS, and FreeBSD without hardware; it has reached playability on hundreds of titles and recently launched ShadNet for online multiplayer without PSN or PS Plus.

### Reformatted Snippet

```cpp
u64 GetStub(const char* nid) {
    if (UsedStubEntries >= MAX_STUBS) {
        return (u64)&UnknownStub;
    }

    const auto entry = FindByNid(nid);
    if (!entry) {
        stub_nids_unknown[UsedStubEntries] = nid;
    } else {
        stub_nids[UsedStubEntries] = entry;
    }

    return (u64)stub_handlers[UsedStubEntries++];
}
```

## Repo 2 — momo5502/sogen

- file_path: src/gdb-stub/gdb_stub.cpp
- snippet_url: https://github.com/momo5502/sogen/blob/main/src/gdb-stub/gdb_stub.cpp

file_intent: GDB remote protocol escape decoder
breakdown_what: Decodes GDB remote serial protocol escape sequences character-by-character — when a `}` escape prefix is found, the next byte is XOR'd with 0x20 to recover the original; an assertion at the end catches a trailing escape marker with no following byte.
breakdown_responsibility: Part of sogen's GDB stub, this handles the transport layer of the GDB remote serial protocol — letting security researchers attach real debuggers to the emulated process and inspect execution state as if it were a native process.
breakdown_clever: `result.reserve(data.size())` pre-allocates the maximum possible output size upfront — since GDB escaping expands the encoded length by inserting `}` markers, the unescaped output can never exceed the input length, making this reserve a safe upper bound that eliminates all reallocations.
project_context: sogen is a Windows and Linux userspace emulator that loads real OS DLLs and intercepts execution at the syscall level, giving security researchers and malware analysts fully deterministic, reproducible runs where every instruction and API call can be hooked or inspected.

### Reformatted Snippet

```cpp
std::string unescape(const std::string_view data)
{
    std::string result{};
    result.reserve(data.size());

    bool xor_next = false;

    for (auto value : data)
    {
        if (xor_next)
        {
            value ^= 0x20;
            xor_next = false;
        }
        else if (value == '}')
        {
            xor_next = true;
            continue;
        }

        result.push_back(value);
    }

    rt_assert(!xor_next);

    return result;
}
```

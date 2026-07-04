# Snippet Candidates — 2026-07-03 — C_Cpp

Issue: #21
Date: 2026-07-03
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — shadps4-emu/shadPS4

### Candidate 1 (most important)

- file_path: src/shader_recompiler/ir/microinstruction.cpp
- snippet_url: https://github.com/shadps4-emu/shadPS4/blob/main/src/shader_recompiler/ir/microinstruction.cpp
- reasoning: This function sits at the heart of the GCN-to-Vulkan shader recompiler's SSA IR — it enforces the critical invariant that Phi instructions and regular instructions use different backing storage (phi_args vs args), and uses std::destroy_at/std::construct_at to safely transition between the two in-place without heap allocation.

```cpp
void Inst::ReplaceOpcode(IR::Opcode opcode) {
    if (opcode == IR::Opcode::Phi) {
        UNREACHABLE_MSG("Cannot transition into Phi");
    }
    if (op == Opcode::Phi) {
        // Transition out of phi arguments into non-phi
        std::destroy_at(&phi_args);
        std::construct_at(&args);
    }
    op = opcode;
}
```

### Candidate 2

- file_path: src/core/aerolib/stubs.cpp
- snippet_url: https://github.com/shadps4-emu/shadPS4/blob/main/src/core/aerolib/stubs.cpp
- reasoning: This function implements the emulator's fallback for unimplemented PS4 library calls — rather than crashing or returning a generic stub, it assigns each NID to one of 8192 compile-time-generated unique function pointers (built via a consteval index_sequence expansion), so the logger can pinpoint exactly which unresolved function was called from the return address.

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

### Candidate 3 (least important)

- file_path: src/core/aerolib/aerolib.cpp
- snippet_url: https://github.com/shadps4-emu/shadPS4/blob/main/src/core/aerolib/aerolib.cpp
- reasoning: The NID table that backs all PS4 symbol resolution is stored as a constexpr sorted array (built from a macro-expanded .inl file), and this binary search over it is the single lookup path shared by both fully-resolved HLE symbols and stub generation — worth understanding because the NID strings are not human-readable names but 11-character SHA-1 digests of the original symbol names salted with a fixed 16-byte key.

```cpp
const NidEntry* FindByNid(const char* nid) {
    s64 l = 0;
    s64 r = sizeof(NIDS) / sizeof(NIDS[0]) - 1;

    while (l <= r) {
        const size_t m = l + (r - l) / 2;
        const int cmp = std::strcmp(NIDS[m].nid, nid);
        if (cmp == 0) {
            return &NIDS[m];
        } else if (cmp < 0) {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }
    return nullptr;
}
```

## Repo 2 — momo5502/sogen

### Candidate 1 (most important)

- file_path: src/backends/kvm-emulator/kvm_x86_64_emulator.cpp
- snippet_url: https://github.com/momo5502/sogen/blob/main/src/backends/kvm-emulator/kvm_x86_64_emulator.cpp
- reasoning: This function is the gatekeeper for correct KVM exception frame synthesis — the emulator routes guest exceptions through single-HLT stubs in an internal IDT, then reconstructs each faulting frame from scratch; getting the error-code set wrong corrupts the guest stack and crashes any exception handler, so this table of vectors (including the less-known CET Control Protection vector 21) is load-bearing for running real Windows code.

```cpp
        bool exception_has_error_code(const uint32_t vector)
        {
            switch (vector)
            {
            case 8:  // #DF
            case 10: // #TS
            case 11: // #NP
            case 12: // #SS
            case 13: // #GP
            case 14: // #PF
            case 17: // #AC
            case 21: // #CP
                return true;
            default:
                return false;
            }
        }
```

### Candidate 2

- file_path: src/gdb-stub/gdb_stub.cpp
- snippet_url: https://github.com/momo5502/sogen/blob/main/src/gdb-stub/gdb_stub.cpp
- reasoning: This implements the GDB remote serial protocol's binary escape format, where `}` is the escape prefix and the following byte is XOR'd with 0x20 — a non-obvious encoding that affects `$`, `#`, `}`, and `*`; the trailing `rt_assert(!xor_next)` enforces the protocol invariant that data must never end on a dangling escape prefix, making protocol violations detectable.

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

### Candidate 3 (least important)

- file_path: src/windows-emulator/emulator_thread.cpp
- snippet_url: https://github.com/momo5502/sogen/blob/main/src/windows-emulator/emulator_thread.cpp
- reasoning: This is the emulator's thread-wakeup primitive — called whenever a wait resolves — that atomically clears all six wait conditions and records the wake status; the conditional `alerted = false` exposes an unresolved NT alertable-wait subtlety (the developer's own TODO), where clearing `alerted` only when `waiting_for_alert` was set may differ from how the real kernel handles the case where an APC fires after the alert flag was already consumed.

```cpp
    void emulator_thread::mark_as_ready(const NTSTATUS status)
    {
        this->pending_status = status;
        this->await_time = {};
        this->await_objects = {};
        this->await_msg = {};
        this->await_msg_mask = {};
        this->await_io_completion = {};
        this->await_host_condition = {};

        // TODO: Find out if this is correct
        if (this->waiting_for_alert)
        {
            this->alerted = false;
        }

        this->waiting_for_alert = false;
    }
```

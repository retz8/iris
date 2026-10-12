# Breakdown Review — 2026-10-09 — C/C++

Issue: #34
Date: 2026-10-09
Language: C/C++
Status: COMPLETED

## Repo 1 — zeldaret/tww

- file_path: src/SSystem/SComponent/c_math.cpp
- snippet_url: https://github.com/zeldaret/tww/blob/main/src/SSystem/SComponent/c_math.cpp

file_intent: Fixed-point atan2 angle lookup
breakdown_what: Computes the angle between two floats in the game's 16-bit fixed-point angle format by checking for zero inputs, then selecting one of eight sign/magnitude cases to look up and adjust a precomputed arctangent table value into the correct quadrant.
breakdown_responsibility: Underpins the game's math library, giving systems like camera tracking, enemy aiming, and physics a cheap, deterministic angle calculation — one decompilers must reproduce bit-for-bit, matching the original console's exact fixed-point output rather than any mathematically equivalent atan2.
breakdown_clever: The sprawling branching isn't naive code — it exists so the function never calls atan2 or divides by near-zero, instead mirroring the original math library's exact case split and table lookup, because decompilation demands bit-identical output, not just equivalent behavior.
project_context: zeldaret/tww is a community-driven decompilation project reconstructing the matching C++ source code of The Legend of Zelda: The Wind Waker from the original GameCube binary, requiring no game assets and used by modders and preservationists to study and rebuild the game's engine.

### Reformatted Snippet

```cpp
s16 cM_atan2s(float f0, float f1) {
    u32 retVar;
    if (cM3d_IsZero(f0)) {
        if (f1 >= 0.0f) {
            retVar = 0;
        } else {
            retVar = 0x8000;
        }
    } else if (cM3d_IsZero(f1)) {
        if (f0 >= 0.0f) {
            retVar = 0x4000;
        } else {
            retVar = 0xC000;
        }
    } else if (f0 >= 0.0f) {
        if (f1 >= 0.0f) {
            if (f1 >= f0) {
                retVar = U_GetAtanTable(f0, f1);
            } else {
                retVar = 0x4000 - U_GetAtanTable(f1, f0);
            }
        } else {
            if (-f1 < f0) {
                retVar = U_GetAtanTable(-f1, f0) + 0x4000;
            } else {
                retVar = 0x8000 - U_GetAtanTable(f0, -f1);
            }
        }
    } else if (f1 < 0.0f) {
        if (f1 <= f0) {
            retVar = U_GetAtanTable(-f0, -f1) + 0x8000;
        } else {
            retVar = 0xC000 - U_GetAtanTable(-f1, -f0);
        }
    } else {
        if (f1 < -f0) {
            retVar = U_GetAtanTable(f1, -f0) + 0xC000;
        } else {
            retVar = -U_GetAtanTable(-f0, f1);
        }
    }
    return retVar;
}
```

## Repo 2 — hluk/CopyQ

- file_path: src/common/command.cpp
- snippet_url: https://github.com/hluk/CopyQ/blob/master/src/common/command.cpp#L41-L60

file_intent: Command classification bitmask builder
breakdown_what: Derives a CommandType bitmask from a command's independent boolean flags (automatic, display, global shortcut, named menu entry), then overrides the whole result to Script if the command is a script, and falls back to Invalid or adds Disabled as needed.
breakdown_responsibility: Feeds CopyQ's command-list UI and matching logic one composable type value instead of five separate flags, so menus, shortcuts, and automatic-trigger checks can branch on a single field rather than re-deriving the same boolean combination at every call site.
breakdown_clever: isScript's override happens after the OR of the other flags, not before — meaning a script can still carry automatic/display/menu bits conceptually, but type() deliberately discards them, encoding the rule that "script-ness" is mutually exclusive with every other command category.
project_context: CopyQ is a free, cross-platform (Linux, Windows, macOS) clipboard manager that keeps a searchable, taggable history of everything copied, supporting scripting and automation so users can edit, filter, and replay clipboard entries across tabbed history views.

### Reformatted Snippet

```cpp
int Command::type() const
{
    auto type =
           (automatic ? CommandType::Automatic : 0)
         | (display ? CommandType::Display : 0)
         | (isGlobalShortcut ? CommandType::GlobalShortcut : 0)
         | (inMenu && !name.isEmpty() ? CommandType::Menu : 0);

    // Scripts cannot be used in other types of commands.
    if (isScript)
        type = CommandType::Script;

    if (type == CommandType::None)
        type = CommandType::Invalid;

    if (!enable)
        type |= CommandType::Disabled;

    return type;
}
```

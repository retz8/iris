# Snippet Candidates — 2026-10-09 — C/C++

Issue: #34
Date: 2026-10-09
Language: C/C++
Status: PENDING_SELECTION

## Repo 1 — zeldaret/tww

### Candidate 1 (most important)

- file_path: src/SSystem/SComponent/c_math.cpp
- snippet_url: https://github.com/zeldaret/tww/blob/main/src/SSystem/SComponent/c_math.cpp
- reasoning: This is the game's fast fixed-point atan2 implementation (lookup table + octant-symmetry reduction instead of a true trig call), and it underlies nearly every angle calculation in the game — aiming, camera orientation, AI facing, physics — so understanding it unlocks a huge swath of the rest of the codebase.

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

### Candidate 2

- file_path: src/d/d_bg_s_acch.cpp
- snippet_url: https://github.com/zeldaret/tww/blob/main/src/d/d_bg_s_acch.cpp
- reasoning: Part of the actor-ground collision system (dBgS_Acch) that runs every frame for every actor in the world, this function clamps a standing actor under a ceiling and re-probes the roof only once it's close enough to matter, a small but central piece of why Wind Waker's terrain traversal feels solid.

```cpp
void dBgS_Acch::GroundRoofProc(dBgS& i_bgs) {
    if (m_ground_h != -G_CM3D_F_INF) {
        if (field_0xb8 < field_0xC4 && field_0xC4 < pm_pos->y) {
            pm_pos->y = field_0xC4;
        }

        if (!(m_flags & ROOF_NONE)) {
            if (m_ground_h >= m_roof_height) {
                m_roof.SetExtChk(*this);
                ClrRoofHit();
                cXyz pos = *pm_pos;
                m_roof.SetPos(pos);
                m_roof_height = i_bgs.RoofChk(&m_roof);
            }
        }
    }
}
```

### Candidate 3 (least important)

- file_path: src/m_Do/m_Do_mtx.cpp
- snippet_url: https://github.com/zeldaret/tww/blob/main/src/m_Do/m_Do_mtx.cpp
- reasoning: A matrix-to-Euler-angle extraction helper used throughout the engine's math layer, interesting for its explicit gimbal-lock special case (when the X rotation hits ±90°) that a naive decomposition would get wrong, though it's a narrower utility than the other two candidates.

```cpp
void mDoMtx_MtxToRot(const Mtx m, csXyz* o_rot) {
    f32 f31 = m[0][2];
    f31 *= f31;
    f32 f30 = m[2][2];
    f31 += f30 * f30;
    f31 = std::sqrtf(f31);
    o_rot->x = cM_atan2s(-m[1][2], f31);

    if (o_rot->x == 0x4000 || o_rot->x == -0x4000) {
        o_rot->z = 0;
        o_rot->y = cM_atan2s(-m[2][0], m[0][0]);
    } else {
        o_rot->y = cM_atan2s(m[0][2], m[2][2]);
        o_rot->z = cM_atan2s(m[1][0], m[1][1]);
    }
}
```

## Repo 2 — hluk/CopyQ

### Candidate 1 (most important)

- file_path: src/common/action.cpp
- snippet_url: https://github.com/hluk/CopyQ/blob/master/src/common/action.cpp#L161-L169
- reasoning: This is the mechanism that lets CopyQ's command/automation system chain shell commands with `|`, and the paired-iterator loop (`it1 = it2++`) that links each process's stdout to the next process's stdin is a subtle idiom worth a second look.

```cpp
template <typename Iterator>
void pipeThroughProcesses(Iterator begin, Iterator end)
{
    auto it1 = begin;
    for (auto it2 = it1 + 1; it2 != end; it1 = it2++) {
        (*it1)->setStandardOutputProcess(*it2);
        connectProcessFinished(*it2, *it1, &QProcess::terminate);
    }
}
```

### Candidate 2

- file_path: src/common/command.cpp
- snippet_url: https://github.com/hluk/CopyQ/blob/master/src/common/command.cpp#L41-L60
- reasoning: This bitmask computation decides how every user-defined Command behaves (automatic trigger, menu item, global shortcut, or script), making it the dispatch logic behind CopyQ's signature "run commands on clipboard change" feature.

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

### Candidate 3 (least important)

- file_path: src/common/shortcuts.cpp
- snippet_url: https://github.com/hluk/CopyQ/blob/master/src/common/shortcuts.cpp#L11-L25
- reasoning: A compact, easy-to-misjudge algorithm for locating a menu mnemonic's `&`-prefixed hotkey character while correctly skipping escaped `&&` pairs, used throughout CopyQ's menu/UI labeling.

```cpp
int indexOfKeyHint(const QString &name)
{
    bool amp = false;
    int i = 0;

    for (const auto &c : name) {
        if (c == '&')
            amp = !amp;
        else if (amp)
            return i - 1;
        ++i;
    }

    return -1;
}
```

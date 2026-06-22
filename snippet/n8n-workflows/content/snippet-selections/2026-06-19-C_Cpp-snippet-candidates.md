# Snippet Candidates — 2026-06-19 — C_Cpp

Issue: #19
Date: 2026-06-19
Language: C_Cpp
Status: COMPLETED

## Repo 1 — ocornut/imgui

### Candidate 1 (most important)

- file_path: imgui_draw.cpp
- snippet_url: https://github.com/ocornut/imgui/blob/master/imgui_draw.cpp
- reasoning: This is ImGui's core adaptive Bezier tessellation routine — a recursive de Casteljau subdivision that uses a flatness test to decide when to emit a point rather than subdivide further, making it the algorithm responsible for how every curved shape in ImGui is rasterized.

```cpp
static void PathBezierCubicCurveToCasteljau(
    ImVector<ImVec2>* path,
    float x1, float y1,
    float x2, float y2,
    float x3, float y3,
    float x4, float y4,
    float tess_tol, int level)
{
    float dx = x4 - x1;
    float dy = y4 - y1;
    float d2 = (x2 - x4) * dy - (y2 - y4) * dx;
    float d3 = (x3 - x4) * dy - (y3 - y4) * dx;
    d2 = (d2 >= 0) ? d2 : -d2;
    d3 = (d3 >= 0) ? d3 : -d3;
    if ((d2 + d3) * (d2 + d3) <
        tess_tol * (dx * dx + dy * dy))
    {
        path->push_back(ImVec2(x4, y4));
    }
    else if (level < 10)
    {
        float x12  = (x1 + x2) * 0.5f;
        float y12  = (y1 + y2) * 0.5f;
        float x23  = (x2 + x3) * 0.5f;
        float y23  = (y2 + y3) * 0.5f;
        float x34  = (x3 + x4) * 0.5f;
        float y34  = (y3 + y4) * 0.5f;
        float x123 = (x12 + x23) * 0.5f;
        float y123 = (y12 + y23) * 0.5f;
        float x234 = (x23 + x34) * 0.5f;
        float y234 = (y23 + y34) * 0.5f;
        float x1234 = (x123 + x234) * 0.5f;
        float y1234 = (y123 + y234) * 0.5f;
        PathBezierCubicCurveToCasteljau(path,
            x1, y1, x12, y12, x123, y123,
            x1234, y1234, tess_tol, level + 1);
        PathBezierCubicCurveToCasteljau(path,
            x1234, y1234, x234, y234,
            x34, y34, x4, y4,
            tess_tol, level + 1);
    }
}
```

### Candidate 2

- file_path: imgui_widgets.cpp
- snippet_url: https://github.com/ocornut/imgui/blob/master/imgui_widgets.cpp
- reasoning: `ShrinkWidths` implements a greedy shrink algorithm that sorts tab/item widths largest-first, then removes equal fractions from the widest group at each step — the engine behind how ImGui distributes width across tab bars and other multi-item layouts without starving any single item.

```cpp
void ImGui::ShrinkWidths(
    ImGuiShrinkWidthItem* items,
    int count,
    float width_excess,
    float width_min)
{
    if (count == 1)
    {
        if (items[0].Width >= 0.0f)
            items[0].Width = ImMax(
                items[0].Width - width_excess,
                width_min);
        return;
    }
    ImQsort(items, (size_t)count,
        sizeof(ImGuiShrinkWidthItem),
        ShrinkWidthItemComparer);
    int count_same_width = 1;
    while (width_excess > 0.001f &&
           count_same_width < count)
    {
        while (count_same_width < count &&
               items[0].Width <=
               items[count_same_width].Width)
            count_same_width++;
        float max_remove =
            (count_same_width < count &&
             items[count_same_width].Width >= 0.0f)
            ? (items[0].Width -
               items[count_same_width].Width)
            : (items[0].Width - 1.0f);
        max_remove = ImMin(
            items[0].Width - width_min, max_remove);
        if (max_remove <= 0.0f)
            break;
        float base_remove = ImMin(
            width_excess / count_same_width,
            max_remove);
        for (int n = 0; n < count_same_width; n++)
        {
            float w = ImMin(base_remove,
                items[n].Width - width_min);
            items[n].Width -= w;
            width_excess -= w;
        }
    }
    width_excess = 0.0f;
    for (int n = 0; n < count; n++)
    {
        float wr = ImTrunc(items[n].Width);
        width_excess += items[n].Width - wr;
        items[n].Width = wr;
    }
    while (width_excess > 0.0f)
        for (int n = 0;
             n < count && width_excess > 0.0f;
             n++)
        {
            float add = ImMin(
                items[n].InitialWidth -
                items[n].Width, 1.0f);
            items[n].Width += add;
            width_excess -= add;
        }
}
```

### Candidate 3 (least important)

- file_path: misc/cpp/imgui_stdlib.cpp
- snippet_url: https://github.com/ocornut/imgui/blob/master/misc/cpp/imgui_stdlib.cpp
- reasoning: This callback shows ImGui's extensibility idiom — a `CallbackResize` hook that grows a `std::string` in-place when the input buffer needs more space, demonstrating how ImGui's callback chain lets users swap in custom allocators without touching core code.

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

### Candidate 1 (most important)

- file_path: src/eval/eval_ir.c
- snippet_url: https://github.com/EpicGames/raddebugger/blob/master/src/eval/eval_ir.c
- reasoning: This function sits at the heart of the debugger's expression evaluator — it compacts signed 64-bit constants into the smallest valid bytecode encoding before pushing them onto the IR op list, showing how the debugger minimizes bytecode size for its stack-based eval VM.

```c
internal void
e_oplist_push_sconst(Arena *arena, E_OpList *list, S64 x)
{
  if(-0x80 <= x && x <= 0x7F)
  {
    e_oplist_push_op(arena, list,
      RDI_EvalOp_ConstU8, e_value_u64((U64)x));
    e_oplist_push_op(arena, list,
      RDI_EvalOp_TruncSigned, e_value_u64(8));
  }
  else if(-0x8000 <= x && x <= 0x7FFF)
  {
    e_oplist_push_op(arena, list,
      RDI_EvalOp_ConstU16, e_value_u64((U64)x));
    e_oplist_push_op(arena, list,
      RDI_EvalOp_TruncSigned, e_value_u64(16));
  }
  else if(-0x80000000ll <= x && x <= 0x7FFFFFFFll)
  {
    e_oplist_push_op(arena, list,
      RDI_EvalOp_ConstU32, e_value_u64((U64)x));
    e_oplist_push_op(arena, list,
      RDI_EvalOp_TruncSigned, e_value_u64(32));
  }
  else
  {
    e_oplist_push_op(arena, list,
      RDI_EvalOp_ConstU64, e_value_u64((U64)x));
  }
}
```

### Candidate 2

- file_path: src/base/base_core.c
- snippet_url: https://github.com/EpicGames/raddebugger/blob/master/src/base/base_core.c
- reasoning: This dual-path zero-byte scanner reveals how the codebase exploits SIMD on x64 while falling back to a branchless bitmask trick (SWAR — SIMD Within A Register) on other architectures, making it an unusually instructive example of portable low-level optimization.

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

### Candidate 3 (least important)

- file_path: src/base/base_core.c
- snippet_url: https://github.com/EpicGames/raddebugger/blob/master/src/base/base_core.c
- reasoning: A three-line branchless sign-extension trick using XOR-then-subtract shows how the debugger reinterprets raw memory bytes of arbitrary width as signed integers without any loop or conditional, which is a pattern that trips up many C developers.

```c
internal S64
extend_sign64(U64 x, U64 size)
{
  U64 n = size * 8;
  U64 m = (U64)1 << (n - 1);
  S64 r = (S64)((x ^ m) - m);
  return r;
}
```

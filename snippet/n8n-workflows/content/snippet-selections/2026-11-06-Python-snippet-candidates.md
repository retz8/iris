# Snippet Candidates — 2026-11-06 — Python

Issue: #38
Date: 2026-11-06
Language: Python
Status: COMPLETED

## Repo 1 — NVIDIA/auto-ontology

### Candidate 1 (most important)

- file_path: auto_ontology/retrieval/text_to_sql/formatters_util.py
- snippet_url: https://github.com/NVIDIA/auto-ontology/blob/main/auto_ontology/retrieval/text_to_sql/formatters_util.py
- reasoning: This builds the per-column row of the schema context fed straight into the text-to-SQL LLM prompt, so its nullability tri-state and format-dedup heuristic directly shape whether the generated SQL is correct.

```python
def _column_row(column: Any) -> dict[str, str]:
    if not isinstance(column, dict):
        return {"column": _plain_cell(column)}
    description = _plain_cell(column.get("description"))
    notation = _plain_cell(column.get("format"))
    if notation and "format:" in description.lower():
        notation = ""
    nullability = column.get("is_nullable")
    if nullability is True:
        nullable = "true"
    elif nullability is False:
        nullable = "false"
    else:
        nullable = "unknown"
    return {
        "column": _plain_cell(column.get("name", "UNKNOWN")),
        "type": _plain_cell(column.get("data_type", "UNKNOWN")),
        "is_nullable": nullable,
        "foreign key": _plain_cell(column.get("semantic_fk")),
        "description": description,
        "sample values": _plain_cell(
            _format_sample_values(column.get("sample_values"))
        ),
        "format": notation,
    }
```

### Candidate 2

- file_path: auto_ontology/semantic/fk_suggester.py
- snippet_url: https://github.com/NVIDIA/auto-ontology/blob/main/auto_ontology/semantic/fk_suggester.py
- reasoning: This is the gatekeeper for Auto Ontology's headline feature — inferring undeclared foreign keys — deciding via a walrus-operator filter which columns are even eligible for the LLM to flag as a likely FK.

```python
def _candidate_columns(
    columns: list[dict[str, Any]],
    *,
    excluded: set[str],
) -> list[dict[str, Any]]:
    return [
        col
        for col in columns
        if (name := col.get("name"))
        and name not in excluded
        and not col.get("is_foreign_key_target")
    ]
```

### Candidate 3 (least important)

- file_path: auto_ontology/semantic/bridge_tables.py
- snippet_url: https://github.com/NVIDIA/auto-ontology/blob/main/auto_ontology/semantic/bridge_tables.py
- reasoning: A narrower helper on top of FK inference — it renders a junction/bridge table's foreign-key pairs into the join description the LLM uses to synthesize a structural join, with a ternary that quietly handles cross-schema references.

```python
def _format_fk_block(fk_pairs: list[dict[str, Any]]) -> str:
    lines = []
    for pair in fk_pairs:
        src = pair.get("source_column", "")
        tgt_schema = pair.get("target_schema", "")
        tgt_table = pair.get("target_table", "")
        tgt_col = pair.get("target_column", "")
        lines.append(
            f"  - {src} -> {tgt_schema}.{tgt_table}.{tgt_col}"
            if tgt_schema
            else f"  - {src} -> {tgt_table}.{tgt_col}"
        )
    return "\n".join(lines)
```

## Repo 2 — guillaumemeyer/watermarks-remover

### Candidate 1 (most important)

- file_path: service/scripts/detect_gumbel.py
- snippet_url: https://github.com/guillaumemeyer/watermarks-remover/blob/main/service/scripts/detect_gumbel.py#L170-L184
- reasoning: This is the arithmetic heart of the repo's most advanced feature — a model-free, same-key replay of the keyed-Gumbel (Aaronson EXP) text-watermark scheme, turning cryptographic HMAC replay plus a Gamma-tail statistic into a real detector with no GPU or vendor API required.

```python
    total = len(ids)
    statistic = 0.0
    counted = 0
    seen_windows: set[tuple[int, ...]] = set()
    skipped_repeated = 0
    for t in range(window, total):
        win = tuple(ids[t - window : t])
        if mask_repeated:
            if win in seen_windows:
                skipped_repeated += 1
                continue
            seen_windows.add(win)
        u = _uniform(_seed(key_bytes, win), ids[t])
        statistic += -math.log1p(-u)
        counted += 1
```

### Candidate 2

- file_path: service/scripts/score_stylometry.py
- snippet_url: https://github.com/guillaumemeyer/watermarks-remover/blob/main/service/scripts/score_stylometry.py#L279-L298
- reasoning: This function drives the stylometric AI-cadence detector that decides whether text needs a Layer B rewrite, scanning for weighted phrase markers and packaging the matches for the composite score downstream.

```python
def scan_ai_phrases(text: str) -> list[MarkerMatch]:
    """Find and tally high-frequency AI cadence phrases."""
    matches: list[MarkerMatch] = []
    for pattern, label, weight in AI_PHRASE_PATTERNS:
        found_spans = []
        offsets: list[tuple[int, int]] = []
        for m in re.finditer(pattern, text, re.IGNORECASE):
            found_spans.append(m.group(0))
            offsets.append((m.start(), m.end()))
        if found_spans:
            matches.append(
                MarkerMatch(
                    phrase=label,
                    count=len(found_spans),
                    weight=weight,
                    samples=found_spans[:3],
                    spans=offsets[:10],
                )
            )
    return matches
```

### Candidate 3 (least important)

- file_path: service/scripts/text_unicode.py
- snippet_url: https://github.com/guillaumemeyer/watermarks-remover/blob/main/service/scripts/text_unicode.py#L269-L281
- reasoning: This classifier decides which Unicode codepoints count as invisible/steganographic carriers that the default Layer A cleaner strips from every file — foundational but narrower in scope than the other two.

```python
def _is_strip_cp(cp: int) -> bool:
    if cp in STRIP_CODEPOINTS:
        return True
    if cp in _VS_SUPPLEMENT:
        return True
    # Tag characters used in some stego schemes (U+E0001-U+E007F)
    if 0xE0001 <= cp <= 0xE007F:
        return True
    if _is_noncharacter(cp):
        return True
    if _is_reserved_ignorable(cp):
        return True
    return bool(_is_private_use(cp))
```

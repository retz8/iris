# Snippet Candidates — 2026-09-25 — Python

Issue: #32
Date: 2026-09-25
Language: Python
Status: PENDING_SELECTION

## Repo 1 — vectorize-io/hindsight

### Candidate 1 (most important)

- file_path: hindsight-api-slim/hindsight_api/engine/query_analyzer.py
- snippet_url: https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/engine/query_analyzer.py#L163-L190
- reasoning: This scoring heuristic decides whether a query span is a real date reference or a false positive (a port number, ticket id, buffer size) — the exact judgment call that makes or breaks Hindsight's "temporal" arm of its multi-strategy (TEMPR) retrieval.

```python
def _date_match_score(text: str) -> int:
    """Score how strong a temporal signal a matched span carries.
    """
    tokens = _TOKEN_RE.findall(text.lower())
    if not tokens:
        return 0
    token_set = set(tokens)
    score = 0
    if any(any(ch.isdigit() for ch in tok) for tok in tokens):
        if _is_bare_year_span(tokens, token_set):
            return 0
        score += 100
    if token_set & _MONTH_WORDS:
        score += 50
    if token_set & _RELATIVE_WORDS:
        score += 50
    if token_set & _WEEKDAY_WORDS:
        score += 30
    if token_set & _PERIOD_WORDS:
        score += 20
    return score
```

### Candidate 2

- file_path: hindsight-api-slim/hindsight_api/engine/entity_resolver.py
- snippet_url: https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/engine/entity_resolver.py#L144-L159
- reasoning: A small numeric-fingerprint extractor that keeps Hindsight's entity resolution from merging "Room 101" into "Room 102" — a concrete example of the sharp edge cases a memory system's entity-dedup graph has to get right.

```python
@lru_cache(maxsize=100_000)
def _numbers_in(name: str) -> frozenset[str]:
    numbers = []
    for run in _DIGIT_RUN.findall(name):
        parts = run.split(".")
        parts[0] = parts[0].lstrip("0") or "0"
        # Drop an all-zero part, but keep 3.10 distinct from 3.1.
        if len(parts) == 2 and not parts[1].strip("0"):
            parts.pop()
        numbers.append(".".join(parts))
    return frozenset(numbers)
```

### Candidate 3 (least important)

- file_path: hindsight-api-slim/hindsight_api/engine/search/tag_resolution.py
- snippet_url: https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/engine/search/tag_resolution.py#L197-L215
- reasoning: A recursive tree-walk gate that lets Hindsight skip an expensive tag-vocabulary read for the common case of exact-only tag filters, only paying the cost when a query actually opts into fuzzy tag matching.

```python
def needs_resolution(tag_groups: list[TagGroup] | None) -> bool:
    """Whether any leaf in the tree asks for fuzzy matching.
    """
    if not tag_groups:
        return False

    def _walk(group: TagGroup) -> bool:
        if isinstance(group, TagGroupLeaf):
            return group.resolve != "exact"
        if isinstance(group, (TagGroupAnd, TagGroupOr)):
            return any(_walk(child) for child in group.filters)
        if isinstance(group, TagGroupNot):
            return _walk(group.filter)
        return False

    return any(_walk(group) for group in tag_groups)
```

## Repo 2 — odoo/odoo

### Candidate 1 (most important)

- file_path: odoo/tools/set_expression.py
- snippet_url: https://github.com/odoo/odoo/blob/20.0/odoo/tools/set_expression.py#L368-L385
- reasoning: This is the De Morgan negation for Odoo's set-algebra representation of security/access groups (union-of-intersections), the mechanism underlying every `ir.rule` and group-based visibility check across the ORM and UI.

```python
    def __invert__(self) -> Union:
        if self.is_empty():
            return UNIVERSAL_UNION
        if self.is_universal():
            return EMPTY_UNION

        # apply De Morgan's laws
        inverses_of_inters = [
            # ~(A & B) = ~A | ~B
            Union(Inter([~leaf]) for leaf in inter.leaves)
            for inter in self.__inters
        ]
        result = inverses_of_inters[0]
        # ~(A | B) = ~A & ~B
        for inverse in inverses_of_inters[1:]:
            result = result & inverse

        return result
```

### Candidate 2

- file_path: odoo/tools/misc.py
- snippet_url: https://github.com/odoo/odoo/blob/20.0/odoo/tools/misc.py#L410-L436
- reasoning: `merge_sequences` reduces to `topological_sort` (a DFS-based algorithm) to merge several partially-ordered sequences into one consistent order, the technique Odoo relies on to combine inherited orderings (e.g. view/field precedence) from multiple sources.

```python
def merge_sequences[T](*iterables: Iterable[T]) -> list[T]:
    # dict is ordered
    deps: defaultdict[T, list[T]] = defaultdict(list)  # {item: elems_before_item}
    for iterable in iterables:
        prev: T | Sentinel = SENTINEL
        for item in iterable:
            if prev is SENTINEL:
                deps[item]  # just set the default
            else:
                deps[item].append(prev)
            prev = item
    return topological_sort(deps)
```

### Candidate 3 (least important)

- file_path: odoo/tools/sql.py
- snippet_url: https://github.com/odoo/odoo/blob/20.0/odoo/tools/sql.py#L414-L422
- reasoning: A neat workaround for a PostgreSQL limitation — you can't always retype a column that a view depends on — so Odoo's auto-migration drops the dependent views first and lets them be recreated afterward, part of what makes Odoo's schema auto-migration on module upgrade possible.

```python
def drop_depending_views(cr: Cursor, table: str, column: str):
    for v, k in get_depending_views(cr, table, column):
        cr.execute(SQL(
            "DROP %s IF EXISTS %s CASCADE",
            SQL("MATERIALIZED VIEW" if k == "m" else "VIEW"),
            SQL.identifier(v),
        ))
        _schema.debug("Drop view %r", v)
```

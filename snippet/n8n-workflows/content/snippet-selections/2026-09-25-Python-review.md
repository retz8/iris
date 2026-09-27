# Breakdown Review — 2026-09-25 — Python

Issue: #32
Date: 2026-09-25
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — vectorize-io/hindsight

- file_path: hindsight-api-slim/hindsight_api/engine/query_analyzer.py
- snippet_url: https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/engine/query_analyzer.py#L163-L190

file_intent: temporal signal scoring heuristic
breakdown_what: Scores how strongly a matched text span signals a date reference by checking for digits, month names, relative time words, weekdays, and period words, then sums weighted points into a single confidence score.
breakdown_responsibility: Feeds a downstream ranking step in Hindsight's query analyzer that decides whether a user query carries enough temporal intent to trigger time-aware memory retrieval, letting the system distinguish real dates from incidental numbers like IDs or years.
breakdown_clever: The function deliberately zeroes out spans that are only a bare four-digit year, since a lone number like that is likely a version, ID, or count rather than a genuine date, preventing false positives on ordinary numeric text.
project_context: Hindsight is an open-source agent memory system from Vectorize that lets AI agents store and recall facts, experiences, and reflections over time, aiming to give LLM-based agents human-like memory instead of just replaying raw conversation history.

### Reformatted Snippet

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

## Repo 2 — odoo/odoo

- file_path: odoo/tools/set_expression.py
- snippet_url: https://github.com/odoo/odoo/blob/20.0/odoo/tools/set_expression.py#L368-L385

file_intent: group-based set expression algebra
breakdown_what: Computes the logical negation of a Union of intersection terms by applying De Morgan's laws: each intersection's leaves are individually inverted and re-unioned, and those per-term inversions are then intersected together into the final complement.
breakdown_responsibility: Underpins Odoo's set-expression engine, which represents which security groups can access a view, menu, or field as combinations of unions and intersections, letting the framework compute complements like "not in this group" and evaluate a user's group membership efficiently.
breakdown_clever: Rather than wrapping the expression in a generic not node, it distributes the negation term by term via De Morgan's laws and folds the pieces back with intersection, keeping the complement a first-class Union object other operators can already handle.
project_context: Odoo is a widely deployed open-source ERP and business-app suite, covering everything from CRM and accounting to inventory, manufacturing, and point of sale, used by millions of companies worldwide ranging from small businesses on the free Community edition to larger enterprises on the paid Enterprise edition.

### Reformatted Snippet

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

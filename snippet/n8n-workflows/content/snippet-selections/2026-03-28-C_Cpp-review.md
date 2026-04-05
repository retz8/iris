# Breakdown Review — 2026-03-28 — C/C++

Issue: #7
Date: 2026-03-28
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — duckdb/duckdb

- file_path: src/execution/aggregate_hashtable.cpp
- snippet_url: https://github.com/duckdb/duckdb/blob/main/src/execution/aggregate_hashtable.cpp

file_intent: Aggregate hash table probe loop
breakdown_what: Probes a hash table for each incoming row using salt-prefix comparison to short-circuit full key comparison, routing each row to either an empty slot (new group) or a candidate-match slot via two output SelectionVectors, with linear probing on collision.
breakdown_responsibility: Forms the hot inner loop of DuckDB's GROUP BY aggregation — classifying every row as a new group or an existing-group candidate before any aggregate function runs, which lets aggregation operate on batches rather than row-by-row.
breakdown_clever: The `HAS_SEL` template parameter eliminates the branch between `sel_vector->get_index_unsafe(i)` and bare `i` at compile time rather than runtime. The CPU's branch predictor never sees that conditional — a meaningful win in a loop that executes on every row of every GROUP BY query.
project_context: The "SQLite for analytics" — an embeddable, zero-dependency OLAP engine that data scientists and BI tools use to query large CSV/Parquet files in-process without a separate server; adopted by dbt, Fivetran, MotherDuck, and widely used across data pipelines.

### Reformatted Snippet

```cpp
template <bool HAS_SEL>
static void GroupedAggregateHashTableInnerLoop(
    ht_entry_t *const entries,
    const idx_t capacity,
    const hash_t bitmask,
    const hash_t *const hash_salts,
    uint64_t *const ht_offsets,
    const SelectionVector *const sel_vector,
    const idx_t remaining_entries,
    SelectionVector &empty_vector,
    SelectionVector &compare_vector,
    idx_t &empty_count,
    idx_t &compare_count) {
    for (idx_t i = 0;
         i < remaining_entries;
         i++) {
        const auto index =
            HAS_SEL
            ? sel_vector->get_index_unsafe(i)
            : i;
        const auto salt = hash_salts[index];
        auto &ht_offset = ht_offsets[index];

        idx_t inner_iteration_count;
        for (inner_iteration_count = 0;
             inner_iteration_count < capacity;
             inner_iteration_count++) {
            auto &entry = entries[ht_offset];
            if (!entry.IsOccupied()) {
                entry.SetSalt(salt);
                empty_vector.set_index(
                    empty_count++, index);
                break;
            }
            if (DUCKDB_LIKELY(
                    entry.GetSalt() == salt)) {
                compare_vector.set_index(
                    compare_count++, index);
                break;
            }
            // Linear probing
            SaltIncrementAndWrap(
                ht_offset, salt, bitmask);
        }
        if (DUCKDB_UNLIKELY(
                inner_iteration_count
                == capacity)) {
            throw InternalException(
                "Maximum inner iteration "
                "count reached in "
                "GroupedAggregateHashTable");
        }
    }
}
```

## Repo 2 — systemd/systemd

- file_path: src/core/job.c
- snippet_url: https://github.com/systemd/systemd/blob/main/src/core/job.c

file_intent: Service job execution order comparator
breakdown_what: Compares two service jobs for execution ordering — short-circuiting on NOP or order-ignoring flags, normalizing AFTER to a mirrored BEFORE comparison, and always placing STOP/RESTART jobs before START jobs.
breakdown_responsibility: Feeds into systemd's job transaction scheduler to ensure services stop in the correct sequence before their dependents start — critical for correct shutdown ordering and service restart cycles across the entire init system.
breakdown_clever: The AFTER direction is handled by inverting the arguments and recursing as BEFORE — `return -job_compare(b, a, UNIT_ATOM_BEFORE)` — meaning AFTER ordering is never independently implemented. Any bug in BEFORE ordering would automatically be mirrored in AFTER, keeping the two directions in sync by construction.
project_context: The dominant init system and service manager on Linux, standard across Debian, Ubuntu, Fedora, RHEL, and virtually every other major distribution — responsible for booting the system, managing daemons, logging via journald, and handling user sessions on virtually all production Linux deployments.

### Reformatted Snippet

```c
int job_compare(
    Job *a,
    Job *b,
    UnitDependencyAtom assume_dep) {
        assert(a);
        assert(b);
        assert(
            a->type <
            _JOB_TYPE_MAX_IN_TRANSACTION);
        assert(
            b->type <
            _JOB_TYPE_MAX_IN_TRANSACTION);
        assert(IN_SET(assume_dep,
                      UNIT_ATOM_AFTER,
                      UNIT_ATOM_BEFORE));

        /* Trivial cases first */
        if (a->type == JOB_NOP ||
            b->type == JOB_NOP)
                return 0;

        if (a->ignore_order ||
            b->ignore_order)
                return 0;

        if (assume_dep == UNIT_ATOM_AFTER)
                return -job_compare(
                    b, a,
                    UNIT_ATOM_BEFORE);

        /* JOB_STOP goes always first.
         * JOB_RESTART is JOB_STOP in
         * disguise (before patched to
         * JOB_START). */
        if (IN_SET(b->type,
                   JOB_STOP,
                   JOB_RESTART))
                return 1;
        else
                return -1;
}
```

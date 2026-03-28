# Breakdown Review — 2026-03-28 — C/C++

Issue: #7
Date: 2026-03-28
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — duckdb/duckdb

- file_path: src/execution/aggregate_hashtable.cpp
- snippet_url: https://github.com/duckdb/duckdb/blob/main/src/execution/aggregate_hashtable.cpp

file_intent: Aggregate hash table probe loop
breakdown_what: Probes a hash table for GROUP BY aggregation: walks entries via linear probing for each row, routing salt-matching entries to `compare_vector` (existing group candidates) and empty slots to `empty_vector` (new groups), deferring actual key comparison to a downstream batched step.
breakdown_responsibility: Is the hot-path core of DuckDB's GROUP BY engine — the `HAS_SEL` template parameter eliminates a per-row branch by compiling two separate code paths at build time: one for selection-vector-filtered rows and one for dense full-batch iteration, removing inner-loop branching entirely.
breakdown_clever: The salt serves double duty: it shortcuts group candidate identification via equality check before a full key comparison, and also drives the collision stride in `SaltIncrementAndWrap` — making each probe's step size hash-derived rather than fixed, reducing slot clustering compared to classic linear probing.
project_context: DuckDB is an in-process analytical SQL database that embeds directly into applications with no server setup — used by data engineers and scientists at companies like Meta, Google, and Airbnb, and increasingly as the backend for AI data pipelines over local Parquet files.

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
    for (idx_t i = 0; i < remaining_entries; i++) {
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

file_intent: Service job ordering comparator
breakdown_what: Compares two systemd jobs to determine their startup/shutdown ordering: short-circuits on NOP or ignore-order flags, reduces AFTER relationships by recursively inverting a BEFORE comparison, and enforces that STOP and RESTART jobs always precede START jobs.
breakdown_responsibility: Feeds systemd's transaction scheduler — when multiple units change state simultaneously, this comparator sorts the pending job queue so services stop before dependents start and RESTART operations complete their stop phase before new starts are enqueued.
breakdown_clever: The AFTER case recurses as `return -job_compare(b, a, UNIT_ATOM_BEFORE)`, avoiding duplicated logic by reducing AFTER to BEFORE via argument swap and sign flip — but this only holds if the function strictly returns -1/0/+1; any other value would silently break AFTER ordering.
project_context: systemd is the init system and service manager used on virtually every modern Linux distribution — managing boot sequences, service lifecycles, socket activation, and process supervision for systems ranging from developer laptops to production cloud containers.

### Reformatted Snippet

```c
int job_compare(
    Job *a,
    Job *b,
    UnitDependencyAtom assume_dep) {
        assert(a);
        assert(b);
        assert(a->type < _JOB_TYPE_MAX_IN_TRANSACTION);
        assert(b->type < _JOB_TYPE_MAX_IN_TRANSACTION);
        assert(IN_SET(assume_dep,
                      UNIT_ATOM_AFTER,
                      UNIT_ATOM_BEFORE));

        /* Trivial cases first */
        if (a->type == JOB_NOP || b->type == JOB_NOP)
                return 0;

        if (a->ignore_order || b->ignore_order)
                return 0;

        if (assume_dep == UNIT_ATOM_AFTER)
                return -job_compare(
                    b, a, UNIT_ATOM_BEFORE);

        /* JOB_STOP goes always first.
         * JOB_RESTART is JOB_STOP in disguise
         * (before patched to JOB_START). */
        if (IN_SET(b->type, JOB_STOP, JOB_RESTART))
                return 1;
        else
                return -1;
}
```

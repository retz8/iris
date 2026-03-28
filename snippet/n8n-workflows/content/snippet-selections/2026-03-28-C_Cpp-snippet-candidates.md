# Snippet Candidates — 2026-03-28 — C_Cpp

Issue: #7
Date: 2026-03-28
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — duckdb/duckdb

### Candidate 1 (most important)

- file_path: src/execution/aggregate_hashtable.cpp
- snippet_url: https://github.com/duckdb/duckdb/blob/main/src/execution/aggregate_hashtable.cpp
- reasoning: This is the inner loop of DuckDB's grouped aggregate hash table — every GROUP BY query passes through it — and it reveals the salt-based linear probing trick where an odd increment derived from the upper hash bits guarantees full table coverage while minimising false key comparisons.

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

### Candidate 2

- file_path: src/execution/join_hashtable.cpp
- snippet_url: https://github.com/duckdb/duckdb/blob/main/src/execution/join_hashtable.cpp
- reasoning: `ProbeAndSpill` elegantly encodes DuckDB's out-of-core join strategy — it hashes probe rows, uses radix selection to split them into "can probe now" vs "must spill to disk", then only initialises a scan structure for the matching partition, making unbounded join datasets practical.

```cpp
void JoinHashTable::ProbeAndSpill(
    ScanStructure &scan_structure,
    DataChunk &probe_keys,
    TupleDataChunkState &key_state,
    ProbeState &probe_state,
    DataChunk &probe_chunk,
    ProbeSpill &probe_spill,
    ProbeSpillLocalAppendState &spill_state,
    DataChunk &spill_chunk) {
    // hash all the keys
    Vector hashes(LogicalType::HASH);
    Hash(probe_keys,
         *FlatVector::IncrementalSelectionVector(),
         probe_keys.size(), hashes);

    // find out which keys match pinned partitions
    SelectionVector true_sel(STANDARD_VECTOR_SIZE);
    SelectionVector false_sel(STANDARD_VECTOR_SIZE);
    const auto true_count = RadixPartitioning::Select(
        hashes,
        FlatVector::IncrementalSelectionVector(),
        probe_keys.size(), radix_bits,
        current_partitions,
        &true_sel, &false_sel);
    const auto false_count =
        probe_keys.size() - true_count;

    // can't probe these now — spill them
    spill_chunk.Reset();
    spill_chunk.Reference(probe_chunk);
    spill_chunk.data.back().Reference(hashes);
    spill_chunk.Slice(false_sel, false_count);
    probe_spill.Append(spill_chunk, spill_state);

    // slice what we CAN probe right now
    hashes.Slice(true_sel, true_count);
    probe_keys.Slice(true_sel, true_count);
    probe_chunk.Slice(true_sel, true_count);

    const SelectionVector *current_sel;
    InitializeScanStructure(
        scan_structure, probe_keys,
        key_state, current_sel);
    if (scan_structure.count == 0) {
        return;
    }
    GetRowPointers(
        probe_keys, key_state, probe_state,
        hashes, current_sel,
        scan_structure.count,
        scan_structure.pointers,
        scan_structure.sel_vector,
        scan_structure.has_null_value_filter);
}
```

### Candidate 3 (least important)

- file_path: src/optimizer/topn_optimizer.cpp
- snippet_url: https://github.com/duckdb/duckdb/blob/main/src/optimizer/topn_optimizer.cpp
- reasoning: The `CanOptimize` heuristic reveals a non-obvious cost-model decision — DuckDB only rewrites `ORDER BY … LIMIT N` to a heap-based Top-N operator when N is under 0.7% of estimated child cardinality and under 5000 rows, because beyond that threshold a full sort is cheaper.

```cpp
bool TopN::CanOptimize(
    LogicalOperator &op,
    optional_ptr<ClientContext> context) {
    if (op.type !=
        LogicalOperatorType::LOGICAL_LIMIT) {
        return false;
    }
    auto &limit = op.Cast<LogicalLimit>();
    if (limit.limit_val.Type() !=
        LimitNodeType::CONSTANT_VALUE) {
        return false;
    }
    if (limit.offset_val.Type() ==
        LimitNodeType::EXPRESSION_VALUE) {
        return false;
    }

    auto child_op = op.children[0].get();
    if (context) {
        child_op->EstimateCardinality(*context);
    }

    if (child_op->has_estimated_cardinality) {
        auto constant_limit = static_cast<double>(
            limit.limit_val.GetConstantValue());
        if (limit.offset_val.Type() ==
            LimitNodeType::CONSTANT_VALUE) {
            constant_limit += static_cast<double>(
                limit.offset_val
                    .GetConstantValue());
        }
        auto child_card = static_cast<double>(
            child_op->estimated_cardinality);

        // if limit > 0.7% of child cardinality,
        // sorting the whole table is faster
        bool limit_is_large =
            constant_limit > 5000;
        if (constant_limit >
                child_card * 0.007
            && limit_is_large) {
            return false;
        }
    }

    while (child_op->type ==
           LogicalOperatorType
               ::LOGICAL_PROJECTION) {
        D_ASSERT(!child_op->children.empty());
        child_op = child_op->children[0].get();
    }
    return child_op->type ==
           LogicalOperatorType
               ::LOGICAL_ORDER_BY;
}
```

## Repo 2 — systemd/systemd

### Candidate 1 (most important)

- file_path: src/basic/hashmap.c
- snippet_url: https://github.com/systemd/systemd/blob/main/src/basic/hashmap.c
- reasoning: This implements the Robin Hood open-addressing insertion used by systemd's own hashmap — a fundamental data structure throughout the entire codebase — and the "steal from the rich" displacement swap is a non-obvious technique that directly bounds worst-case lookup time.

```c
static bool hashmap_put_robin_hood(HashmapBase *h, unsigned idx,
                                   struct swap_entries *swap) {
        dib_raw_t raw_dib, *dibs;
        unsigned dib, distance;

#if ENABLE_DEBUG_HASHMAP
        h->debug.put_count++;
#endif

        dibs = dib_raw_ptr(h);

        for (distance = 0; ; distance++) {
                raw_dib = dibs[idx];
                if (IN_SET(raw_dib, DIB_RAW_FREE, DIB_RAW_REHASH)) {
                        if (raw_dib == DIB_RAW_REHASH)
                                bucket_move_entry(
                                        h, swap, idx, IDX_TMP);

                        if (h->has_indirect &&
                            h->indirect.idx_lowest_entry > idx)
                                h->indirect.idx_lowest_entry = idx;

                        bucket_set_dib(h, idx, distance);
                        bucket_move_entry(h, swap, IDX_PUT, idx);
                        if (raw_dib == DIB_RAW_REHASH) {
                                bucket_move_entry(
                                        h, swap, IDX_TMP, IDX_PUT);
                                return true;
                        }

                        return false;
                }

                dib = bucket_calculate_dib(h, idx, raw_dib);

                if (dib < distance) {
                        /* Found a wealthier entry. Go Robin Hood! */
                        bucket_set_dib(h, idx, distance);

                        /* swap the entries */
                        bucket_move_entry(h, swap, idx, IDX_TMP);
                        bucket_move_entry(h, swap, IDX_PUT, idx);
                        bucket_move_entry(h, swap, IDX_TMP, IDX_PUT);

                        distance = dib;
                }

                idx = next_idx(h, idx);
        }
}
```

### Candidate 2

- file_path: src/core/job.c
- snippet_url: https://github.com/systemd/systemd/blob/main/src/core/job.c
- reasoning: This function encodes systemd's entire job scheduling precedence — the recursive symmetry trick (`AFTER` flips to `BEFORE` via negation) and the explicit stop-before-start invariant reveal how the dependency graph is linearized at transaction time.

```c
int job_compare(Job *a, Job *b, UnitDependencyAtom assume_dep) {
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
                return -job_compare(b, a, UNIT_ATOM_BEFORE);

        /* Let's make it simple, JOB_STOP goes always first
         * (in case both ua and ub stop, then ub's stop goes
         * first anyway). JOB_RESTART is JOB_STOP in disguise
         * (before it is patched to JOB_START). */
        if (IN_SET(b->type, JOB_STOP, JOB_RESTART))
                return 1;
        else
                return -1;
}
```

### Candidate 3 (least important)

- file_path: src/basic/in-addr-util.c
- snippet_url: https://github.com/systemd/systemd/blob/main/src/basic/in-addr-util.c
- reasoning: This CIDR intersection check is a small masterclass in defensive bitwise arithmetic — the zero-prefix early return exists solely to avoid undefined behavior from a 32-bit left-shift by 32, a subtle C gotcha that catches many network programmers off guard.

```c
bool in4_addr_prefix_intersect(
                const struct in_addr *a,
                unsigned aprefixlen,
                const struct in_addr *b,
                unsigned bprefixlen) {

        assert(a);
        assert(b);

        unsigned m = MIN3(
                aprefixlen,
                bprefixlen,
                (unsigned) (sizeof(struct in_addr) * 8));
        if (m == 0)
                /* Avoid shift by 32 — undefined behavior in C */
                return true;

        uint32_t x = be32toh(a->s_addr ^ b->s_addr);
        uint32_t n = 0xFFFFFFFFUL << (32 - m);
        return (x & n) == 0;
}
```

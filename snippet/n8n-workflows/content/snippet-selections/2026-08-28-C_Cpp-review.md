# Breakdown Review — 2026-08-28 — C/C++

Issue: #28
Date: 2026-08-28
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — vicinaehq/vicinae

- file_path: src/lib/script-command/src/script-command.cpp
- snippet_url: https://github.com/vicinaehq/vicinae/blob/main/src/lib/script-command/src/script-command.cpp

file_intent: Script metadata key-value line parser
breakdown_what: Parses one comment line into a structured key-value pair, recognizing `@vicinae.` and `@raycast.` scope prefixes, stripping surrounding whitespace, and returning an empty optional for any line that does not match the format.
breakdown_responsibility: Feeds the script command registration pipeline, extracting declarative metadata — title, mode, icon, arguments — embedded in script file comments so Vicinae can register commands in the launcher UI without a separate manifest file.
breakdown_clever: Accepting `@raycast` as a valid scope alongside `@vicinae` means existing Raycast script commands run in Vicinae unmodified. The compatibility hook is invisible in the UI but is the primary frictionless migration path for Raycast users switching to Linux.
project_context: Vicinae is a native C++/Qt6 desktop launcher for Linux and macOS, built as an open-source Raycast alternative. It runs Raycast-compatible script commands and extensions natively, giving Linux users access to the Raycast extension ecosystem on their platform.

### Reformatted Snippet

```cpp
static std::optional<KV> parseKV(
    std::string_view line)
{
  static const auto scopes = {
    "@vicinae", "@raycast"
  };
  size_t i = 0;

  while (i < line.size()
         && std::isspace(line.at(i)))
    ++i;

  if (i == line.size()
      || line.at(i) != '@') return {};

  auto pos = line.find('.', i);
  if (pos == std::string::npos) return {};

  const std::string_view scope =
      line.substr(i, pos - i);
  if (!std::ranges::contains(scopes, scope)) {
    return {};
  }

  const int keyStart = pos + 1;
  int keyEnd = keyStart;

  while (keyEnd < (int)line.size()
         && !std::isspace(line.at(keyEnd))) {
    ++keyEnd;
  }

  const std::string_view key =
      line.substr(keyStart, keyEnd - keyStart);

  int valueStart = keyEnd;
  while (valueStart < (int)line.size()
         && std::isspace(line.at(valueStart))) {
    ++valueStart;
  }

  const std::string_view value =
      line.substr(valueStart);
  return KV(scope, key, value);
}
```

## Repo 2 — MariaDB/server

- file_path: sql/item_vectorfunc.cc
- snippet_url: https://github.com/MariaDB/server/blob/main/sql/item_vectorfunc.cc

file_intent: SQL vector distance function type resolver
breakdown_what: Binds the correct distance function — Euclidean or cosine — to a SQL `VEC_DISTANCE()` call at query-compile time. In AUTO mode, introspects both arguments' vector index metadata to pick the metric the index was built with.
breakdown_responsibility: Lets MariaDB query authors omit the distance metric in `VEC_DISTANCE()` calls on indexed columns, because the optimizer reads it from the index definition, making vector similarity queries semantically correct by default without extra syntax.
breakdown_clever: AUTO mode resolves the metric by walking storage-level key metadata, then calls `fix_length_and_dec` recursively with the resolved kind. The second call always hits a non-AUTO branch — the recursion terminates exactly once, guaranteed by the switch structure.
project_context: MariaDB Server added native vector search with MHNSW indexing in version 11.7, enabling SQL databases to store and query embedding vectors directly alongside relational data, targeting RAG pipelines and AI workloads without introducing new infrastructure.

### Reformatted Snippet

```cpp
bool Item_func_vec_distance::fix_length_and_dec(
    THD *thd)
{
  switch (kind) {
  case EUCLIDEAN:
    calc_distance= calc_distance_euclidean;
    break;
  case COSINE:
    calc_distance= calc_distance_cosine;
    break;
  case AUTO:
    for (uint i=0; i < 2; i++)
      if (auto *item=
            dynamic_cast<Item_field*>(
              args[i]->real_item()))
      {
        TABLE_SHARE *share=
          item->field->orig_table->s;
        if (share->tmp_table)
          break;
        Field *f=
          share->field[
            item->field->field_index];
        KEY *kinfo= share->key_info;
        for (uint j= share->keys;
             j < share->total_keys; j++)
          if (kinfo[j].algorithm
                == HA_KEY_ALG_VECTOR
              && f->key_start.is_set(j))
          {
            kind= mhnsw_uses_distance(
              f->table, kinfo + j);
            return fix_length_and_dec(thd);
          }
      }
    my_error(ER_VEC_DISTANCE_TYPE, MYF(0));
    return 1;
  }
  set_maybe_null();
  return Item_real_func::fix_length_and_dec(
    thd);
}
```

# Snippet Candidates — 2026-06-05 — C_Cpp

Issue: #17
Date: 2026-06-05
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — amnezia-vpn/amnezia-client

### Candidate 1 (most important)

- file_path: client/core/protocols/protocolUtils.cpp
- snippet_url: https://github.com/amnezia-vpn/amnezia-client/blob/dev/client/core/protocols/protocolUtils.cpp
- reasoning: This function is the central protocol taxonomy that determines which of Amnezia's ten-plus protocols get VPN treatment (kill-switch, forced routing) versus generic service treatment, making it the branch point for almost all connection behavior in the client.

```cpp
ServiceType ProtocolUtils::protocolService(Proto p)
{
    switch (p) {
    case Proto::Unknown: return ServiceType::None;
    case Proto::SSXray: return ServiceType::None;

    case Proto::OpenVpn: return ServiceType::Vpn;
    case Proto::WireGuard: return ServiceType::Vpn;
    case Proto::Awg: return ServiceType::Vpn;
    case Proto::Ikev2: return ServiceType::Vpn;
    case Proto::Xray: return ServiceType::Vpn;

    case Proto::TorWebSite: return ServiceType::Other;
    case Proto::Dns: return ServiceType::Other;
    case Proto::Sftp: return ServiceType::Other;
    case Proto::Socks5Proxy: return ServiceType::Other;
    case Proto::MtProxy: return ServiceType::Other;
    case Proto::Telemt: return ServiceType::Other;
    default: return ServiceType::Other;
    }
}
```

### Candidate 2

- file_path: client/core/utils/utilities.cpp
- snippet_url: https://github.com/amnezia-vpn/amnezia-client/blob/dev/client/core/utils/utilities.cpp
- reasoning: These two overloads implement recursive nested-exception unwinding using the C++11 `std::rethrow_if_nested` idiom, which is the mechanism the client uses to surface the full causal chain when SSH, OpenSSL, or IPC operations fail across exception boundaries.

```cpp
void Utils::logException(const std::exception &e)
{
    qCritical() << e.what();
    try {
        std::rethrow_if_nested(e);
    } catch (const std::exception &nested) {
        logException(nested);
    } catch (...) {}
}

void Utils::logException(const std::exception_ptr &eptr)
{
    try {
        if (eptr) std::rethrow_exception(eptr);
    } catch (const std::exception &e) {
        logException(e);
    } catch (...) {}
}
```

### Candidate 3 (least important)

- file_path: client/core/utils/networkUtilities.cpp
- snippet_url: https://github.com/amnezia-vpn/amnezia-client/blob/dev/client/core/utils/networkUtilities.cpp
- reasoning: This function handles the two valid forms of an IP route entry — bare IPv4 and CIDR notation — with explicit subnet-range validation, and is called throughout the split-tunneling and allowed-IP configuration paths.

```cpp
bool NetworkUtilities::checkIpSubnetFormat(const QString &ip)
{
    if (!ip.contains("/"))
        return checkIPv4Format(ip);

    QStringList parts = ip.split("/");
    if (parts.size() != 2)
        return false;

    bool ok;
    int subnet = parts.at(1).toInt(&ok);
    if (subnet >= 0 && subnet <= 32 && ok)
        return checkIPv4Format(parts.at(0));
    else
        return false;
}
```

## Repo 2 — tenstorrent/tt-metal

### Candidate 1 (most important)

- file_path: tt_metal/impl/dispatch/simple_trace_allocator.cpp
- snippet_url: https://github.com/tenstorrent/tt-metal/blob/main/tt_metal/impl/dispatch/simple_trace_allocator.cpp
- reasoning: This implements a Belady's-algorithm-inspired online placement heuristic that decides where to locate GPU kernel binaries in a ring buffer across trace nodes, balancing eviction cost against write-ahead stall penalties — the core scheduling intelligence that makes trace replay efficient on Tenstorrent hardware.

```cpp
std::pair<std::optional<uint32_t>, std::optional<uint32_t>>
SimpleTraceAllocator::RegionAllocator::allocate_region(
    uint32_t size, uint32_t trace_idx,
    uint32_t data_type, uint64_t program_id,
    bool top_down) {
    std::optional<uint32_t> best_addr;
    float best_cost =
        std::numeric_limits<float>::infinity();
    std::optional<uint32_t> best_region_sync_idx;
    if (size == 0) {
        return {std::nullopt, 0};
    }
    if (top_down && size > ringbuffer_size_) {
        return {std::nullopt, std::nullopt};
    }

    std::set<uint32_t> marked_for_deletion;
    constexpr uint32_t max_stall_history_size =
        dev_msgs::launch_msg_buffer_num_entries;

    auto evaluate = [&](
        uint32_t addr,
        std::map<uint32_t,
            MemoryUsage>::const_iterator scan_begin
    ) {
        float cost = 0;
        std::optional<uint32_t> region_sync_idx;
        bool now_in_use = false;
        for (auto it = scan_begin;
             it != regions_.end(); ++it) {
            auto region = *it;
            if (region.first >= addr + size) {
                break;
            }
            if (intersects(addr, size,
                    region.first,
                    region.second.size)) {
                if (region.second.trace_idx
                        == trace_idx) {
                    now_in_use = true;
                    break;
                }
                auto& next_use_idx =
                    extra_data_[region.second.trace_idx]
                        .next_use_idx[
                            region.second.data_type];
                if (next_use_idx.has_value()) {
                    if (*next_use_idx == trace_idx) {
                        constexpr uint32_t penalty =
                            1000000000;
                        cost += penalty;
                    } else {
                        // Belady's: evict the region
                        // used farthest in the future.
                        cost += region.second.size
                            * 1.0f
                            / (*next_use_idx
                               - trace_idx);
                    }
                } else if (trace_idx
                    - region.second.trace_idx
                    > max_stall_history_size) {
                    marked_for_deletion.insert(
                        region.first);
                }
                region_sync_idx = merge_syncs(
                    region_sync_idx,
                    region.second.trace_idx);
            }
        }
        if (now_in_use) {
            return false;
        }
        if (region_sync_idx.has_value()) {
            constexpr uint32_t desired_write_ahead =
                std::min(
                    dev_msgs::launch_msg_buffer_num_entries,
                    7u);
            constexpr float stall_badness = 100000000;
            int region_idx_diff =
                trace_idx - *region_sync_idx;
            if (region_idx_diff < desired_write_ahead) {
                cost += stall_badness
                    * (1 << (desired_write_ahead
                             - region_idx_diff));
            }
        }
        if (cost < best_cost) {
            best_cost = cost;
            best_addr = addr;
            best_region_sync_idx = region_sync_idx;
        }
        return cost == 0;
    };
```

### Candidate 2

- file_path: tt_metal/impl/allocator/algorithms/free_list_opt.cpp
- snippet_url: https://github.com/tenstorrent/tt-metal/blob/main/tt_metal/impl/allocator/algorithms/free_list_opt.cpp
- reasoning: This deallocation routine shows how tt-metal's optimized free-list allocator coalesces adjacent free blocks back into the segregated size-class lists, including a lazy lowest-occupied-address scan — revealing the careful bookkeeping required to keep a parallel-array block representation consistent under coalescing.

```cpp
void FreeListOpt::deallocate(
    DeviceAddr absolute_address) {
    DeviceAddr addr =
        absolute_address - offset_bytes_;
    auto block_index_opt =
        get_and_remove_from_alloc_table(addr);
    if (!block_index_opt.has_value()) {
        return;
    }
    size_t block_index = *block_index_opt;
    block_is_allocated_[block_index] = false;
    ssize_t prev_block =
        block_prev_block_[block_index];
    ssize_t next_block =
        block_next_block_[block_index];

    // Merge with previous block if free
    if (prev_block != -1
            && !block_is_allocated_[prev_block]) {
        size_t seg_idx = get_size_segregated_index(
            block_size_[prev_block]);
        auto& seg_list =
            free_blocks_segregated_by_size_[seg_idx];
        auto it = std::find(
            seg_list.begin(),
            seg_list.end(),
            prev_block);
        TT_ASSERT(it != seg_list.end(),
            "Prev block not found in seg list");
        seg_list.erase(it);

        block_size_[prev_block] +=
            block_size_[block_index];
        block_next_block_[prev_block] = next_block;
        if (next_block != -1) {
            block_prev_block_[next_block] =
                prev_block;
        }
        free_meta_block(block_index);
        block_index = prev_block;
    }

    // Merge with next block if free
    if (next_block != -1
            && !block_is_allocated_[next_block]) {
        size_t seg_idx = get_size_segregated_index(
            block_size_[next_block]);
        auto& seg_list =
            free_blocks_segregated_by_size_[seg_idx];
        auto it = std::find(
            seg_list.begin(),
            seg_list.end(),
            next_block);
        TT_ASSERT(it != seg_list.end(),
            "Next block not found in seg list");
        seg_list.erase(it);

        block_size_[block_index] +=
            block_size_[next_block];
        block_next_block_[block_index] =
            block_next_block_[next_block];
        ssize_t nn = block_next_block_[next_block];
        if (nn != -1) {
            block_prev_block_[nn] = block_index;
        }
        free_meta_block(next_block);
    }

    if (addr <= *lowest_occupied_address_) {
        lowest_occupied_address_ = std::nullopt;
        ssize_t cur =
            block_next_block_[block_index];
        while (cur != -1) {
            if (block_is_allocated_[cur]) {
                lowest_occupied_address_ =
                    block_address_[cur];
                break;
            }
            cur = block_next_block_[cur];
        }
    }
    insert_block_to_segregated_list(block_index);
}
```

### Candidate 3 (least important)

- file_path: tt_metal/impl/graph/graph_tracking.cpp
- snippet_url: https://github.com/tenstorrent/tt-metal/blob/main/tt_metal/impl/graph/graph_tracking.cpp
- reasoning: The `GraphTracker` hook mechanism shows a thread-safe observer/interception layer for buffer lifecycle events — where a single registered hook can intercept allocations and a mutex-protected set tracks which buffers are currently hooked, enforcing invariants that catch double-allocation bugs.

```cpp
bool GraphTracker::hook_allocate(
    const Buffer* buffer) {
    if (hook == nullptr) {
        return false;
    }

    bool hooked = hook->hook_allocate(buffer);
    if (hooked) {
        std::lock_guard<std::mutex> lock(
            hooked_buffers_mutex);
        bool inserted =
            hooked_buffers.insert(buffer).second;
        TT_FATAL(inserted,
            "Can't hook allocation of a buffer "
            "which is already allocated");
    }
    return hooked;
}

bool GraphTracker::hook_deallocate(
    Buffer* buffer) {
    if (hook == nullptr) {
        return false;
    }

    bool hooked = hook->hook_deallocate(buffer);
    if (hooked) {
        std::lock_guard<std::mutex> lock(
            hooked_buffers_mutex);
        auto buffer_it =
            hooked_buffers.find(buffer);
        if (buffer_it == hooked_buffers.end()) {
            log_warning(tt::LogMetal,
                "Can't hook deallocation of a "
                "buffer which allocation "
                "wasn't hooked");
        } else {
            hooked_buffers.erase(buffer_it);
        }
    }
    return hooked;
}
```

# Snippet Candidates — 2026-10-03 — C_Cpp

Issue: #33
Date: 2026-10-03
Language: C_Cpp
Status: COMPLETED

## Repo 1 — deepseek-ai/FlashMLA

### Candidate 1 (most important)

- file_path: csrc/api/sparse_decode.cpp
- snippet_url: https://github.com/deepseek-ai/FlashMLA/blob/main/csrc/api/sparse_decode.cpp
- reasoning: This is the SM-partition scheduling heuristic for FlashMLA's sparse-attention decode kernel — it decides how many SM partitions to split KV-cache work across, directly shaping the split-KV parallelism the whole decode path depends on.

```c
    SparseDecodeImplMeta get_meta(int h_q, int s_q) override {
        Arch arch = Arch();
        return {
            std::max(arch.num_sms / s_q, 1),
            5,
            64
        };
    }
```

### Candidate 2

- file_path: csrc/cuda_kernels/utils.h
- snippet_url: https://github.com/deepseek-ai/FlashMLA/blob/main/csrc/cuda_kernels/utils.h
- reasoning: A compact ring-buffer stage/phase calculator underlying the async double-buffered pipelines FlashMLA's kernels use to overlap memory loads with compute.

```c
    template<uint32_t NUM_STAGES>
    __device__ __forceinline__
    std::pair<uint32_t, bool> get() const {
        uint32_t stage_idx = cur_block_idx % NUM_STAGES;
        bool phase = (cur_block_idx / NUM_STAGES) & 1;
        return {stage_idx, phase};
    }
```

### Candidate 3 (least important)

- file_path: csrc/api/common.h
- snippet_url: https://github.com/deepseek-ai/FlashMLA/blob/main/csrc/api/common.h
- reasoning: This small struct is the hardware gate every sparse kernel entry point checks before launching — is_sm100f() enforces that FlashMLA's SM100-only kernels never run on unsupported GPUs.

```c
struct Arch {
    int major;
    int minor;
    int num_sms;
    cudaDeviceProp* device_prop;

    Arch() {
        device_prop = at::cuda::getCurrentDeviceProperties();
        major = device_prop->major;
        minor = device_prop->minor;
        num_sms = device_prop->multiProcessorCount;
    }

    bool is_sm100f() const {
        return major == 10;
    }
};
```

## Repo 2 — FreeRDP/FreeRDP

### Candidate 1 (most important)

- file_path: libfreerdp/core/nla.c
- snippet_url: https://github.com/FreeRDP/FreeRDP/blob/master/libfreerdp/core/nla.c#L977-L994
- reasoning: This is the literal implementation of a CredSSP/NLA protocol quirk — incrementing the server's public key as a replay/MITM-proof before re-encrypting it — a step every modern FreeRDP connection depends on to authenticate at all.

```c
static void ap_integer_increment_le(BYTE* number, size_t size)
{
	WINPR_ASSERT(number || (size == 0));

	for (size_t index = 0; index < size; index++)
	{
		if (number[index] < 0xFF)
		{
			number[index]++;
			break;
		}
		else
		{
			number[index] = 0;
			continue;
		}
	}
}
```

### Candidate 2

- file_path: libfreerdp/codec/interleaved.c
- snippet_url: https://github.com/FreeRDP/FreeRDP/blob/master/libfreerdp/codec/interleaved.c#L174-L195
- reasoning: Decodes the packed opcode byte that drives FreeRDP's Interleaved RLE bitmap decompressor, the foundational RDP codec that turns compressed wire bytes into on-screen pixels.

```c
static inline UINT32 ExtractCodeId(BYTE bOrderHdr)
{
	if ((bOrderHdr & 0xC0U) != 0xC0U)
	{
		/* REGULAR orders
		 * (000x xxxx, 001x xxxx, 010x xxxx, 011x xxxx, 100x xxxx)
		 */
		return bOrderHdr >> 5;
	}
	else if ((bOrderHdr & 0xF0U) == 0xF0U)
	{
		/* MEGA and SPECIAL orders (0xF*) */
		return bOrderHdr;
	}
	else
	{
		/* LITE orders
		 * 1100 xxxx, 1101 xxxx, 1110 xxxx)
		 */
		return bOrderHdr >> 4;
	}
}
```

### Candidate 3 (least important)

- file_path: libfreerdp/codec/rfx_rlgr.c
- snippet_url: https://github.com/FreeRDP/FreeRDP/blob/master/libfreerdp/codec/rfx_rlgr.c#L101-L150
- reasoning: A software fallback for the hardware LZCNT instruction (classic binary-search leading-zero-count trick) underlying the RLGR entropy decoder that powers FreeRDP's RemoteFX codec performance.

```c
static inline UINT32 lzcnt_s(UINT32 x)
{
	if (!x)
		return 32;

	if (!g_LZCNT)
	{
		UINT32 y = 0;
		UINT32 n = 32;
		y = x >> 16;
		if (y != 0)
		{
			WINPR_ASSERT(n >= 16);
			n = n - 16;
			x = y;
		}
		y = x >> 8;
		if (y != 0)
		{
			WINPR_ASSERT(n >= 8);
			n = n - 8;
			x = y;
		}
		y = x >> 4;
		if (y != 0)
		{
			WINPR_ASSERT(n >= 4);
			n = n - 4;
			x = y;
		}
		y = x >> 2;
		if (y != 0)
		{
			WINPR_ASSERT(n >= 2);
			n = n - 2;
			x = y;
		}
		y = x >> 1;
		if (y != 0)
		{
			WINPR_ASSERT(n >= 2);
			return n - 2;
		}

		WINPR_ASSERT(n >= x);
		return n - x;
	}

	return __lzcnt(x);
}
```

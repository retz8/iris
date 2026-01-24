# IRIS Debug Report

**File:** `vibevoice_asr_processor.py`  
**Language:** `python`  
**Execution Path:** 🔧 Tool-Calling (Single-Stage with Dynamic Source Reading)  

---

## Source Code Overview

### Stage 1: Original Source Code

*Source code not available in snapshots*

### Signature Graph Snapshot

**Entities:** 28

```json
{
  "entities": [
    {
      "id": "entity_0",
      "name": "os",
      "type": "import",
      "signature": "import os",
      "line_range": [
        5,
        5
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
      "leading_comment": null,
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_1",
      "name": "json",
      "type": "import",
      "signature": "import json",
      "line_range": [
        6,
        6
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
      "leading_comment": null,
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_2",
      "name": "math",
      "type": "import",
      "signature": "import math",
      "line_range": [
        7,
        7
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
      "leading_comment": null,
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_3",
      "name": "warnings",
      "type": "import",
      "signature": "import warnings",
      "line_range": [
        8,
        8
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
      "leading_comment": null,
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_4",
      "name": "from typing import List, Optional, Union, Dict, Any, Tuple",
      "type": "import",
      "signature": "from typing import List, Optional, Union, Dict, Any, Tuple",
      "line_range": [
        9,
        9
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
  ...(truncated for readability)
```

---

## LLM Processing Metrics

### 🔧 Tool-Calling Execution

Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 7,041 |
| Total Output Tokens | 826 |
| Total Tokens | 7,867 |
| Total Time | 21.38s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 7,041 |
| Output Tokens | 826 |
| Total Tokens | 7,867 |
| Time | 21.38s |

**Throughput:**

- Tokens/Second: 368.0 tok/s
- Input: 7,041 tok | Output: 826 tok | Total: 7,867 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Audio processing system role that integrates ASR model components into a cohesive transcription service with efficient audio handling.",
  "initial_hypothesis": "The file defines a class for processing audio inputs for automatic speech recognition, managing tokenization and transcription.",
  "entity_count_validation": {
    "total_entities": 27,
    "responsibilities_count": 6,
    "required_range": "5-10",
    "passes_anti_collapse_rule": true
  },
  "verification_processes": [],
  "responsibilities": [
    {
      "id": "vibevoice-asr-processor",
      "label": "Audio Processing for ASR",
      "description": "Handles audio input processing and transcription for ASR models.",
      "elements": {
        "functions": [
          "__init__",
          "__call__",
          "_process_single_audio",
          "_batch_encode",
          "post_process_transcription"
        ],
        "state": [],
        "imports": [
          "numpy as np",
          "torch",
          "from transformers.tokenization_utils_base import BatchEncoding"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          30,
          570
        ]
      ]
    },
    {
      "id": "special-token-caching",
      "label": "Special Token Caching",
      "description": "Caches special token IDs for efficiency in processing.",
      "elements": {
        "functions": [
          "_cache_special_tokens"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          71,
          94
        ]
      ]
    },
    {
      "id": "model-loading",
      "label": "Model Loading and Saving",
      "description": "Loads and saves ASR processor configurations from/to directories.",
      "elements": {
        "functions": [
          "from_pretrained",
          "save_pretrained"
        ],
        "state": [],
        "imports": [
          "json",
          "from transformers.utils import cached_file"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          96,
          191
        ]
      ]
    },
    {
      "id": "batch-processing",
      "label": "Batch Processing of Audio",
      "description": "Combines multiple audio encodings into a batch for processing.",
      "elements": {
        "functions": [
          "_batch_encode"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          388,
          474
        ]
      ]
    },
    {
      "id": "decoding",
      "label": "Decoding Token IDs",
      "description": "Decodes token IDs to text for transcription output.",
      "elements": {
        "functions": [
          "batch_decode",
          "decode"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          476,
          488
        ]
      ]
    },
    {
      "id": "transcription-post-processing",
      "label": "Post-Processing Transcription",
      "description": "Post-processes generated transcription text to extract structured data.",
      "elements": {
        "functions": [
          "post_process_transcription"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          490,
          565
        ]
      ]
    }
  ],
  "metadata": {
    "logical_depth": "Deep",
    "notes": "The class encapsulates various functionalities related to audio processing for ASR, including model loading, token caching, and transcription."
  }
}
```

</details>

---

*Report generated for IRIS AST transformation analysis*
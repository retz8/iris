# Breakdown Review — 2026-05-01 — Python

Issue: #12
Date: 2026-05-01
Language: Python
Status: COMPLETED

## Repo 1 — lsdefine/GenericAgent

- file_path: memory/keychain.py
- snippet_url: https://github.com/lsdefine/GenericAgent/blob/main/memory/keychain.py

file_intent: Local API key vault for LLM agents
breakdown_what: Encrypts named secrets to disk using XOR with a username-derived SHA-256 key mask, wraps each retrieved value in a `SecretStr` that redacts itself in repr based on secret length, and persists the store to `~/ga_keychain.enc`.
breakdown_responsibility: Keeps API keys off environment variables and out of log output for GenericAgent's tool calls — any LLM tool that needs a credential calls `.use()` to get the raw value without ever printing it.
breakdown_clever: The four length tiers in `SecretStr.__repr__` are calibrated to key type — short PINs show only `***`, medium tokens show head/tail chars, long API keys show head+tail+length — enough to visually identify a key without exposing enough characters to reconstruct it.
project_context: GenericAgent is a self-evolving AI agent that grows a personal skill tree from a 3,300-line seed, achieving full local system control with 6× less token consumption than comparable frameworks. Developers use it to give an LLM persistent, reusable skills that accumulate across sessions.

### Reformatted Snippet

```python
_PATH = pathlib.Path.home() / "ga_keychain.enc"
try: _user = os.getlogin()
except OSError: _user = getpass.getuser()
_MASK = hashlib.sha256(
    f"{_user}@ga_keychain".encode()).digest()

def _xor(data: bytes) -> bytes:
    return bytes(
        b ^ _MASK[i % len(_MASK)]
        for i, b in enumerate(data))

class SecretStr:
    def __init__(self, name: str, val: str):
        self._name, self._val = name, val
    def use(self) -> str:
        return self._val
    def __repr__(self):
        n = len(self._val)
        if n <= 4:    preview = '***'
        elif n <= 16: preview = (
            f"{self._val[:3]}···{self._val[-3:]}")
        elif n <= 40: preview = (
            f"{self._val[:6]}···{self._val[-6:]} len={n}")
        else:         preview = (
            f"{self._val[:10]}···{self._val[-6:]} len={n}")
        return (f"SecretStr({self._name}={preview})"
                f" # .use() to get raw, do not print raw value")
    __str__ = __repr__

class _Keys:
    def __init__(self):
        self._d = {}
        if _PATH.exists():
            try:
                self._d = json.loads(
                    _xor(_PATH.read_bytes()))
            except Exception as e:
                print(f"[keychain] WARNING: "
                      f"failed to load {_PATH}: {e}")
                _PATH.rename(_PATH.with_suffix('.enc.bak'))
    def __getattr__(self, k):
        if k.startswith('_'): raise AttributeError(k)
        if k not in self._d:
            raise KeyError(f"No secret: {k}")
        return SecretStr(k, self._d[k])
    def set(self, k, v=None, *, file=None):
        if file: v = pathlib.Path(file).read_text().strip()
        self._d[k] = v
        _PATH.write_bytes(
            _xor(json.dumps(self._d).encode()))
    def ls(self): return list(self._d.keys())

keys = _Keys()
```

## Repo 2 — AIDC-AI/Pixelle-Video

- file_path: pixelle_video/services/llm_service.py
- snippet_url: https://github.com/AIDC-AI/Pixelle-Video/blob/main/pixelle_video/services/llm_service.py

file_intent: Three-tier LLM JSON response parser
breakdown_what: Attempts to deserialize an LLM text response into a Pydantic model using three strategies in order: raw `json.loads`, regex extraction from a markdown code fence, and brace-scanning the raw string for any JSON object.
breakdown_responsibility: Shields the rest of Pixelle-Video's video generation pipeline from LLM output formatting variability — every stage that calls an LLM gets back a typed Pydantic model or a clear `ValueError`, regardless of how the model chose to format its reply.
breakdown_clever: The three strategies are ordered by LLM failure frequency — markdown wrapping is more common than prose prefixing, so the regex runs second and brace-scanning last, making the cascade stop as early as possible rather than always trying all three.
project_context: Pixelle-Video is a fully automated AI short-video engine that takes a text topic and produces a complete video through scriptwriting, image generation, TTS narration, and frame composition. Content creators use it to generate short-form social videos from a single prompt with no manual editing.

### Reformatted Snippet

```python
def _parse_response_as_model(
    self,
    content: str,
    response_type: Type[T]
) -> T:
    # Try direct JSON parsing first
    try:
        data = json.loads(content)
        return response_type.model_validate(data)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    json_pattern = r'```(?:json)?\s*([\s\S]+?)\s*```'
    match = re.search(json_pattern, content, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            return response_type.model_validate(data)
        except json.JSONDecodeError:
            pass

    # Try to find any JSON object in the text
    brace_start = content.find('{')
    brace_end = content.rfind('}')
    if brace_start != -1 and brace_end > brace_start:
        try:
            json_str = content[brace_start:brace_end + 1]
            data = json.loads(json_str)
            return response_type.model_validate(data)
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Failed to parse LLM response as "
        f"{response_type.__name__}: "
        f"{content[:200]}..."
    )
```

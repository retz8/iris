# Snippet Candidates — 2026-07-17 — Python

Issue: #23
Date: 2026-07-17
Language: Python
Status: PENDING_SELECTION

## Repo 1 — virattt/ai-hedge-fund

### Candidate 1 (most important)

- file_path: src/graph/state.py
- snippet_url: https://github.com/virattt/ai-hedge-fund/blob/main/src/graph/state.py
- reasoning: This is the LangGraph state schema that every agent in the system reads and writes; the `Annotated` reducer pattern — `operator.add` for messages and a custom `merge_dicts` for data — is what makes concurrent multi-agent writes safe without explicit locking.

```python
def merge_dicts(
    a: dict[str, any],
    b: dict[str, any],
) -> dict[str, any]:
    return {**a, **b}


# Define agent state
class AgentState(TypedDict):
    messages: Annotated[
        Sequence[BaseMessage], operator.add
    ]
    data: Annotated[
        dict[str, any], merge_dicts
    ]
    metadata: Annotated[
        dict[str, any], merge_dicts
    ]
```

### Candidate 2

- file_path: src/agents/technicals.py
- snippet_url: https://github.com/virattt/ai-hedge-fund/blob/main/src/agents/technicals.py
- reasoning: This is the RSI implementation the technicals agent uses to generate signals; the `.where()` + `.fillna(0)` idiom to split a diff series into separate gain and loss streams, then feeding both through `rolling().mean()`, is a compact and vectorised expression of Wilder's smoothing method.

```python
def calculate_rsi(
    prices_df: pd.DataFrame,
    period: int = 14,
) -> pd.Series:
    delta = prices_df["close"].diff()
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```

### Candidate 3 (least important)

- file_path: src/backtesting/types.py
- snippet_url: https://github.com/virattt/ai-hedge-fund/blob/main/src/backtesting/types.py
- reasoning: The backtesting engine tracks portfolio state with keys that contain spaces ("Portfolio Value", "Long/Short Ratio") to match the original dict contract; Python's class-based TypedDict syntax requires valid identifiers, so the codebase falls back to the functional `TypedDict(name, {...})` form to preserve those exact string keys.

```python
PortfolioValuePoint = TypedDict(
    "PortfolioValuePoint",
    {
        "Date": datetime,
        "Portfolio Value": float,
        "Long Exposure": float,
        "Short Exposure": float,
        "Gross Exposure": float,
        "Net Exposure": float,
        "Long/Short Ratio": float,
    },
    total=False,
)
```

## Repo 2 — FoundationAgents/OpenManus

### Candidate 1 (most important)

- file_path: app/agent/react.py
- snippet_url: https://github.com/FoundationAgents/OpenManus/blob/main/app/agent/react.py
- reasoning: This class is the architectural spine of OpenManus — every agent in the repo inherits from it, and the `step` method's one-liner `think → conditional act` loop encodes the entire ReAct (Reason+Act) paradigm; `think()` returning a bool is the gate that separates reasoning from side-effecting execution.

```python
class ReActAgent(BaseAgent, ABC):
    name: str
    description: Optional[str] = None

    system_prompt: Optional[str] = None
    next_step_prompt: Optional[str] = None

    llm: Optional[LLM] = Field(default_factory=LLM)
    memory: Memory = Field(default_factory=Memory)
    state: AgentState = AgentState.IDLE

    max_steps: int = 10
    current_step: int = 0

    @abstractmethod
    async def think(self) -> bool:
        """Process current state and decide next action"""

    @abstractmethod
    async def act(self) -> str:
        """Execute decided actions"""

    async def step(self) -> str:
        """Execute a single step: think and act."""
        should_act = await self.think()
        if not should_act:
            return "Thinking complete - no action needed"
        return await self.act()
```

### Candidate 2

- file_path: app/schema.py
- snippet_url: https://github.com/FoundationAgents/OpenManus/blob/main/app/schema.py
- reasoning: Every agent in the repo holds exactly one `Memory` instance; this class shows that agent context is not a deque or a fixed array but a plain list with a `[-N:]` trim-on-exceed strategy, which means older messages are silently dropped when the rolling window fills — a design choice with direct implications for long-running agents.

```python
class Memory(BaseModel):
    messages: List[Message] = Field(default_factory=list)
    max_messages: int = Field(default=100)

    def add_message(self, message: Message) -> None:
        """Add a message to memory"""
        self.messages.append(message)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages :]

    def add_messages(self, messages: List[Message]) -> None:
        """Add multiple messages to memory"""
        self.messages.extend(messages)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages :]

    def clear(self) -> None:
        """Clear all messages"""
        self.messages.clear()

    def get_recent_messages(self, n: int) -> List[Message]:
        """Get n most recent messages"""
        return self.messages[-n:]

    def to_dict_list(self) -> List[dict]:
        """Convert messages to list of dicts"""
        return [msg.to_dict() for msg in self.messages]
```

### Candidate 3 (least important)

- file_path: app/config.py
- snippet_url: https://github.com/FoundationAgents/OpenManus/blob/main/app/config.py
- reasoning: The global `Config` singleton uses double-checked locking across both `__new__` and `__init__` — necessary because Python calls `__init__` on every constructor call even when `__new__` returns the cached instance, so without the second guard the config would be reloaded on every `Config()` call.

```python
class Config:
    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._config = None
                    self._load_initial_config()
                    self._initialized = True
```

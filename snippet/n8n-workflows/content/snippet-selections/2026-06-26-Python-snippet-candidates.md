# Snippet Candidates — 2026-06-26 — Python

Issue: #20
Date: 2026-06-26
Language: Python
Status: PENDING_SELECTION

## Repo 1 — ZhuLinsen/daily_stock_analysis

### Candidate 1 (most important)

- file_path: src/core/backtest_engine.py
- snippet_url: https://github.com/ZhuLinsen/daily_stock_analysis/blob/main/src/core/backtest_engine.py
- reasoning: Core outcome-classification logic for the backtesting engine — converts a forward return percentage plus an expected direction into a win/loss/neutral verdict using a direction-aware neutral band; the evaluative heart of the repo's accuracy tracking.

```python
@classmethod
def _classify_outcome(
    cls,
    *,
    stock_return_pct: Optional[float],
    direction_expected: str,
    neutral_band_pct: float,
) -> tuple[Optional[str], Optional[bool]]:
    if stock_return_pct is None:
        return None, None

    band = abs(float(neutral_band_pct))
    r = float(stock_return_pct)

    if direction_expected == "up":
        if r >= band:
            return "win", True
        if r <= -band:
            return "loss", False
        return "neutral", None

    if direction_expected == "down":
        if r <= -band:
            return "win", True
        if r >= band:
            return "loss", False
        return "neutral", None

    if direction_expected == "not_down":
        if r >= 0:
            return "win", True
        if r <= -band:
            return "loss", False
        return "neutral", None

    # flat
    if abs(r) <= band:
        return "win", True
    return "loss", False
```

### Candidate 2

- file_path: src/utils/sniper_points.py
- snippet_url: https://github.com/ZhuLinsen/daily_stock_analysis/blob/main/src/utils/sniper_points.py
- reasoning: Parses a price value from messy LLM-generated report text — handles raw floats, Chinese comma separators, yuan currency suffixes, and parenthetical annotations, while carefully skipping MA moving-average references; a real-world example of defensive NLP post-processing in a financial context.

```python
def parse_sniper_value(value: Any) -> Optional[float]:
    """Parse a sniper point value from report text into a positive price."""

    if value is None:
        return None
    if isinstance(value, (int, float)):
        parsed = float(value)
        return parsed if parsed > 0 else None

    text = str(value).replace(",", "").replace("，", "").strip()
    if not text or text in {"-", "—", "N/A"}:
        return None

    try:
        parsed = float(text)
        return parsed if parsed > 0 else None
    except ValueError:
        pass

    colon_pos = max(text.rfind("："), text.rfind(":"))
    yuan_pos = text.find("元", colon_pos + 1 if colon_pos != -1 else 0)
    if yuan_pos != -1:
        segment_start = colon_pos + 1 if colon_pos != -1 else 0
        segment = text[segment_start:yuan_pos]
        valid_numbers = []
        for match in re.finditer(r"-?\d+(?:\.\d+)?", segment):
            start_idx = match.start()
            if (
                start_idx >= 2
                and segment[start_idx - 2:start_idx].upper() == "MA"
            ):
                continue
            valid_numbers.append(match.group())
        if valid_numbers:
            try:
                parsed = abs(float(valid_numbers[-1]))
                return parsed if parsed > 0 else None
            except ValueError:
                pass

    paren_pos = len(text)
    for paren_char in ("(", "（"):
        pos = text.find(paren_char)
        if pos != -1:
            paren_pos = min(paren_pos, pos)
    search_text = text[:paren_pos].strip() or text

    valid_numbers = []
    for match in re.finditer(r"\d+(?:\.\d+)?", search_text):
        start_idx = match.start()
        if start_idx >= 2 and search_text[start_idx - 2:start_idx].upper() == "MA":
            continue
        valid_numbers.append(match.group())
    if valid_numbers:
        try:
            parsed = float(valid_numbers[-1])
            return parsed if parsed > 0 else None
        except ValueError:
            pass
    return None
```

### Candidate 3 (least important)

- file_path: src/phase_decision_guardrail.py
- snippet_url: https://github.com/ZhuLinsen/daily_stock_analysis/blob/main/src/phase_decision_guardrail.py
- reasoning: Sliding-window negation detector that prevents false positives when an LLM output says "do not buy now" — scans backward from a matched action marker to find negation prefixes, supporting both English and Chinese with language-specific window sizes.

```python
def _contains_non_negated_marker(
    text: str,
    markers: tuple[str, ...],
    *,
    language: str,
) -> bool:
    if not text:
        return False
    lowered = text.lower()
    for marker in markers:
        marker_text = marker.lower()
        start = 0
        while True:
            index = lowered.find(marker_text, start)
            if index < 0:
                break
            if not _is_negated_marker(
                lowered, index, language=language
            ):
                return True
            start = index + len(marker_text)
    return False


def _is_negated_marker(
    text: str,
    marker_index: int,
    *,
    language: str,
) -> bool:
    window = 24 if language == "en" else 8
    prefix = text[
        max(0, marker_index - window):marker_index
    ].rstrip()
    negations = (
        _NEGATION_PREFIXES_EN
        if language == "en"
        else _NEGATION_PREFIXES_ZH
    )
    return any(prefix.endswith(item) for item in negations)
```

## Repo 2 — interviewstreet/hiring-agent

### Candidate 1 (most important)

- file_path: github.py
- snippet_url: https://github.com/interviewstreet/hiring-agent/blob/main/github.py
- reasoning: Heart of the hiring pipeline — classifies every GitHub repo as open-source vs. self-project by checking contributor counts, attaches per-author commit stats, and feeds the ranked list into LLM project selection; the single function that determines what the agent "sees" about a candidate.

```python
def fetch_all_github_repos(
    github_url: str, max_repos: int = 100
) -> List[Dict]:
    try:
        username = extract_github_username(github_url)
        if not username:
            print(f"Could not extract username from: {github_url}")
            return []

        api_url = (
            f"https://api.github.com/users/{username}/repos"
        )

        params = {
            "sort": "updated",
            "per_page": min(max_repos, 100),
            "type": "all",
        }

        status_code, repos_data = _fetch_github_api(
            api_url, params=params
        )

        if status_code == 200:
            projects = []
            for repo in repos_data:
                if (
                    repo.get("fork")
                    and repo.get("forks_count", 0) < 5
                ):
                    continue

                repo_name = repo.get("name")

                contributors_data = fetch_repo_contributors(
                    username, repo_name
                )
                contributor_count = len(contributors_data)

                user_contributions, total_contributions = (
                    fetch_contributions_count(
                        username, contributors_data
                    )
                )

                project_type = (
                    "open_source"
                    if contributor_count > 1
                    else "self_project"
                )

                project = {
                    "name": repo.get("name"),
                    "description": repo.get("description"),
                    "github_url": repo.get("html_url"),
                    "live_url": (
                        repo.get("homepage")
                        if repo.get("homepage")
                        else None
                    ),
                    "technologies": (
                        [repo.get("language")]
                        if repo.get("language")
                        else []
                    ),
                    "project_type": project_type,
                    "contributor_count": contributor_count,
                    "author_commit_count": user_contributions,
                    "total_commit_count": total_contributions,
                    "github_details": {
                        "stars": repo.get("stargazers_count", 0),
                        "forks": repo.get("forks_count", 0),
                        "language": repo.get("language"),
                        "description": repo.get("description"),
                        "created_at": repo.get("created_at"),
                        "updated_at": repo.get("updated_at"),
                        "topics": repo.get("topics", []),
                        "open_issues": repo.get(
                            "open_issues_count", 0
                        ),
                        "size": repo.get("size", 0),
                        "fork": repo.get("fork", False),
                        "archived": repo.get("archived", False),
                        "default_branch": repo.get(
                            "default_branch"
                        ),
                        "contributors": contributor_count,
                    },
                }
                projects.append(project)

            projects.sort(
                key=lambda x: x["github_details"]["stars"],
                reverse=True,
            )

            open_source_count = sum(
                1
                for p in projects
                if p["project_type"] == "open_source"
            )
            self_project_count = sum(
                1
                for p in projects
                if p["project_type"] == "self_project"
            )

            print(f"Found {len(projects)} repositories")
            print(
                f"Project classification: "
                f"{open_source_count} open source, "
                f"{self_project_count} self projects"
            )
            return projects

        elif status_code == 404:
            print(f"GitHub user not found: {username}")
            return []
        else:
            print(
                f"GitHub API error: {status_code} - {repos_data}"
            )
            return []

    except requests.exceptions.RequestException as e:
        print(f"Error fetching GitHub repositories: {e}")
        return []
    except Exception as e:
        print(
            f"Unexpected error fetching GitHub repositories: {e}"
        )
        return []
```

### Candidate 2

- file_path: models.py
- snippet_url: https://github.com/interviewstreet/hiring-agent/blob/main/models.py
- reasoning: Production-grade rate-limit retry loop with exponential backoff, API-hint parsing from error messages, and ±20% jitter — wrapped in a duck-typed provider that emits an Ollama-compatible response envelope; an instructive pattern for multi-provider LLM abstraction.

```python
def chat(
    self,
    model: str,
    messages: List[Dict[str, str]],
    options: Dict[str, Any] = None,
    **kwargs
) -> Dict[str, Any]:
    """Send a chat request to Google Gemini API."""
    import re
    import time
    import random
    from google.api_core.exceptions import ResourceExhausted

    MAX_RETRIES = 5
    BASE_DELAY = 10.0
    MAX_DELAY = 120.0

    generation_config = {}
    if options:
        if "temperature" in options:
            generation_config["temperature"] = (
                options["temperature"]
            )
        if "top_p" in options:
            generation_config["top_p"] = options["top_p"]

    gemini_model = self.client.GenerativeModel(
        model_name=model,
        generation_config=generation_config,
    )

    gemini_messages = []
    for msg in messages:
        role = (
            "user" if msg["role"] == "user" else "model"
        )
        gemini_messages.append(
            {"role": role, "parts": [msg["content"]]}
        )

    for attempt in range(MAX_RETRIES):
        try:
            response = gemini_model.generate_content(
                gemini_messages
            )
            return {
                "message": {
                    "role": "assistant",
                    "content": response.text,
                }
            }

        except ResourceExhausted as e:
            if attempt == MAX_RETRIES - 1:
                raise

            match = re.search(
                r"retry[_ ]in\s+([\d.]+)s",
                str(e),
                re.IGNORECASE,
            )
            api_hint = float(match.group(1)) if match else None

            exp_delay = min(
                BASE_DELAY * (2 ** attempt), MAX_DELAY
            )

            delay = (
                api_hint
                if (api_hint and api_hint < exp_delay)
                else exp_delay
            )

            sleep_time = round(
                delay * random.uniform(0.8, 1.2), 2
            )

            print(
                f"[GeminiProvider] Rate limit hit "
                f"(attempt {attempt + 1}/{MAX_RETRIES}). "
                f"Retrying in {sleep_time}s..."
            )
            time.sleep(sleep_time)
```

### Candidate 3 (least important)

- file_path: evaluator.py
- snippet_url: https://github.com/interviewstreet/hiring-agent/blob/main/evaluator.py
- reasoning: Full structured-output LLM call pattern — loading Jinja system/user prompts, passing a Pydantic JSON schema as the `format` kwarg, and deserializing the stripped response back into a typed `EvaluationData` object; a clean reference for anyone wiring structured generation into their own agent.

```python
def evaluate_resume(
    self, resume_text: str
) -> EvaluationData:
    self._last_resume_text = resume_text
    full_prompt = self._load_evaluation_prompt(resume_text)
    try:
        system_message = self.template_manager.render_template(
            "resume_evaluation_system_message"
        )
        if system_message is None:
            raise ValueError(
                "Failed to load resume evaluation "
                "system message template"
            )

        chat_params = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": system_message,
                },
                {
                    "role": "user",
                    "content": full_prompt,
                },
            ],
            "options": {
                "stream": False,
                "temperature": self.model_params.get(
                    "temperature", 0.5
                ),
                "top_p": self.model_params.get(
                    "top_p", 0.9
                ),
            },
        }

        kwargs = {
            "format": EvaluationData.model_json_schema()
        }
        response = self.provider.chat(
            **chat_params, **kwargs
        )

        response_text = response["message"]["content"]
        response_text = extract_json_from_response(
            response_text
        )

        evaluation_dict = json.loads(response_text)
        evaluation_data = EvaluationData(**evaluation_dict)

        return evaluation_data

    except Exception as e:
        logger.error(f"Error evaluating resume: {str(e)}")
        raise
```

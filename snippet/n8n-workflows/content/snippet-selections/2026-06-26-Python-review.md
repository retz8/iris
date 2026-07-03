# Breakdown Review — 2026-06-26 — Python

Issue: #20
Date: 2026-06-26
Language: Python
Status: COMPLETED

## Repo 1 — ZhuLinsen/daily_stock_analysis

- file_path: src/core/backtest_engine.py
- snippet_url: https://github.com/ZhuLinsen/daily_stock_analysis/blob/main/src/core/backtest_engine.py

file_intent: Backtest trade outcome classifier
breakdown_what: Classifies a completed stock trade as win, loss, or neutral by comparing the actual return percentage against a configurable dead-band threshold, conditioned on whether the LLM predicted the stock would go up, down, stay flat, or avoid a drop.
breakdown_responsibility: The core scoring primitive of the backtesting engine — it converts raw price return data into labeled outcomes that the engine aggregates into win-rate, expectancy, and accuracy metrics used to evaluate the LLM's directional predictions.
breakdown_clever: The `not_down` case captures an asymmetric prediction: any non-negative return wins, but a drop past the neutral band still loses. This represents 'floor but not direction' — the LLM forecasting support without committing to a rally.
project_context: An LLM-powered stock analysis tool that fetches multi-market data (A-shares, US, JP, ETFs) and real-time news daily, generates a decision dashboard with AI-summarized signals, and delivers it via WeChat Work, Telegram, Slack, or email — runnable for free on a GitHub Actions schedule.

### Reformatted Snippet

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

## Repo 2 — interviewstreet/hiring-agent

- file_path: evaluator.py
- snippet_url: https://github.com/interviewstreet/hiring-agent/blob/main/evaluator.py

file_intent: LLM resume evaluation orchestrator
breakdown_what: Assembles a chat request from a rendered system prompt template and the candidate's resume text, invokes the configured LLM provider with structured JSON output mode, parses and validates the response into a typed `EvaluationData` object.
breakdown_responsibility: The central scoring call in the hiring pipeline — it turns a raw resume string into a validated, type-safe evaluation record that downstream steps use for scoring, comparison, and explainability reporting.
breakdown_clever: The `kwargs` split keeps the provider interface generic: schema-aware backends use `format: EvaluationData.model_json_schema()` to enforce JSON output structure; others silently ignore it. Actual validation falls to `EvaluationData(**evaluation_dict)` — Pydantic rejects malformed responses before they reach scoring.
project_context: InterviewStreet (the company behind HackerEarth) open-sourced this AI pipeline to automate technical resume screening: it parses PDFs via a local Ollama or hosted Gemini model, enriches each candidate with live GitHub contribution signals, and returns an explainable score with per-category evidence rather than a black-box ranking.

### Reformatted Snippet

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

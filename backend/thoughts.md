# temporary file to record research and ideation on better prompts

### Model change: gpt-5-nano-2025-08-07
- 장점: 매우 빠르다, 싸다 싸
- snapshot으로 model consistency 유지

#### Pricing
per 1M (100,0000 백 만) tokens
- input: $0.05
- cached input: $0.005
- output: $0.40

가볍게 계산해보면,
output을 ~500 tokens로 제한시키고
input을 ~15k로 설정하면
요청 당 약 $0.001
월 10,000 (10K) request -> ~$10 per month (good)


raw source code (~1100 lines): ~10000
current analyzer prompt: ~12000
current critic prompt: ~4000
estimated output tokens: ~500

KPI: 
output tokens / file <= 500

output은 responsibility block의 개수에 따라 달라짐
대충 하나 당 70 ~ 120 token정도 먹는듯
`elements` 필드를 삭제해버리면 ~60 token이 나옴 (id, label, description, ranges)
gpt-5-nano-2025-08-07


LLM Output Schema
{
  "file_intent": "string (1–2 lines)",
  "responsibility_blocks": [
    {
      "id": "string",
      "label": "string (2–5 words)",
      "description": "string (1 sentence)",
      "ranges": [[start, end]]
    }
  ]
}
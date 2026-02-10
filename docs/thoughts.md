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

private vs public code?

AI 코드 시대의 ‘Verification bottleneck’을
developer attention과 trust 관점에서 푸는 UX-first 도구

혹은,

“사람이 언제, 어떤 신호로 AI 생성 코드를 안심할 수 있는지 시각화하는 도구.”

IRIS = Comprehension Layer → Verification Layer → Trust Layer로 확장되는 스택의 시작점
단순히 파일 구조를 맥락화하는 걸 넘어서, 제품이 쌓이면서 인간의 신뢰를 더 구조적으로 지원해야 함.

'내가 AI가 생성한 이 코드들을 안심하고 검증할 수 있는가?'
개발의 속도라기보다는, 오히려 verficiation의 process는 human-in-loop이 들어가야한다는 가정하에

PR Bot?

📌 Authentication File

[Block] Validate Input
 - Responsibility: check fields & types
 - Risk: missing validation → security risk

[Block] Authenticate User
 - Responsibility: lookup + compare hash
 - Risk: logic change influences login rules

[Block] Issue Token
 - Responsibility: create signed JWT with claims
 - Risk: high-impact side effect



https://evan-moon.github.io/2026/01/30/developer-intuition-readable-code-and-neuroscience/

정형화된 패턴/청크 구조를 제공하면 누구라도 더 숙련된 사고를 하게 된다.

→ IRIS는 “숙련자처럼 보는 신호”를 자동으로 제공해 주는 도구가 되어야 한다.

핵심문제:
AI가 코드 생성은 빠르게 해도,
그 코드를 사람이 안심하고 배포 가능한 수준까지 검증하는 데 enormous friction이 생긴다

AI 코드 생성의 가치가 이미 증명되었고, 그 다음 문제(검증/신뢰)가 도전 과제로 남아있다는 점

IRIS의 기회: 신뢰 신호(Trust Signal)를 제공하는 최초의 레이어
| 영역           | 도구              | 역할              |
| ------------ | --------------- | --------------- |
| 생성           | Copilot, Cursor | 코드 작성           |
| 자동 리뷰        | Greptile, Qodo  | 문제 후보/버그 탐지     |
| *이해 & 신뢰 신호* | —               | ❌ 시장에 명확한 리더 없음 |

human-in-loop 과정을 발전시킨다는 niche

사람은 신뢰하기 위해 ‘설명(explanation)’과 ‘맥락(context)’이 필요하다.
자동 생성이나 자동 리뷰만으로는 이 신뢰를 만들 수 없다.

IRIS는 바로 “사람이 신뢰할 수 있는 신호(signal)”를 자동으로 제공하는 레이어


1. NewsLetter
2. VSCode Extension
3. PR Bot (Resp block + Risk, Business Logic, more)
4. Desktop App (platform agnostic)
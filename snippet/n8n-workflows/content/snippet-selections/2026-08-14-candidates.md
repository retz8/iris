# OSS Candidates — 2026-08-14 — Issue #26

Issue: #26
Date: 2026-08-14
Status: COMPLETED

## Python

1. huangruiteng/loopx — Lightweight state-kernel for multi-agent sessions with durable goals, quota-aware scheduling, evidence logs, and verifiable handoffs between models (why this week: creator's X thread showing 200+ hour continuous agent runs — 220h and 272h trajectories — went viral, driving 1,967 stars this week)
2. cactus-compute/needle — 45M-parameter tool-calling model shipped as a single 14 MB binary, running a full session in 28 MB RAM for phones, wearables, and embedded devices (why this week: Needle 2 released Aug 13 with a new Simple Attention Network architecture and CQ2-bit compression; MarkTechPost coverage same day)
3. semantica-agi/semantica — Graph-native infrastructure for context and accountability layers in AI agent pipelines, with temporal validity, weighted BFS traversal, and a Snowflake connector (why this week: v0.6.0 shipped and 4,073 stars poured in this week; widely framed as the open-source Palantir alternative for agent pipelines)
4. vitali87/code-graph-rag — Tree-sitter parser that ingests a multi-language monorepo into a Memgraph knowledge graph for natural-language code search, editing, and cross-language data-flow taint tracing (why this week: newly added UniXcoder semantic search and FLOWS_TO taint edges across C, C++, Java, and Go; 1,628 stars this week)
5. unslothai/unsloth — Local UI for running and fine-tuning LLMs and diffusion models on consumer hardware at 2x speed with 70% less VRAM via hand-written Triton kernels (why this week: Unsloth Desktop Beta launched in August 2026 as a free macOS/Windows/Linux desktop app — first mainstream local AI tool that both runs and trains models; 1,670 stars this week)
6. goauthentik/authentik — Self-hosted identity provider covering OAuth2, SAML, LDAP, RADIUS, and SCIM with a policy engine and brand-matching UI (why this week: 2026.8 release candidate cycle with RC7 out Aug 10, featuring a new Cmd+K command palette and reworked setup wizards; 1,882 stars this week)
7. google/skills — Official Google repo of production-grade agent skills for Google products and technologies, installable via npx and compatible with Claude Code, Codex, and Cursor (why this week: widely reshared after the addyosmani/agent-skills pattern gained traction; 2,359 stars this week)

## JS/TS

1. PrimeIntellect-ai/prime-agent — Self-improving RLM agent that treats context as a Python variable inside a persistent IPython REPL, with a /refine command that turns past trajectories into new skills without retraining (why this week: launched Aug 5 with a report of 95.5% on ARC-AGI-3 paired with Claude Opus 5; AI Weekly and multiple roundups hit simultaneously; 12,476 stars this week — top TypeScript trending repo)
2. cloudflare/computer — Open-source agent runtime that gives each agent a virtual computer with a SQLite-backed filesystem, shell, and git access, dynamically switching between lightweight isolates and full Linux containers (why this week: shipped Day 1 of Cloudflare's Agents Week on Aug 3; Cloudflare blog and InfoQ coverage drove 3,599 stars this week)
3. DietrichGebert/ponytail — Agent middleware encoding a "laziest senior dev" philosophy: pushes agents to reach for native browser APIs and delete code rather than build components (why this week: hit GitHub Trending #12 Aug 12 with viral posts about reducing 400+ lines to ~23 on date and color pickers; 4,902 stars this week)
4. addyosmani/agent-skills — 20 production-grade engineering skills for AI coding agents covering the full dev lifecycle from define to ship, compatible with Claude Code, Codex, and Cursor (why this week: authored by Google Chrome's Addy Osmani; the npx skills add install workflow got wide pickup on dev Twitter; 4,562 stars this week)
5. paperclipai/paperclip — Open-source app for managing AI agents at work — assign tasks, track runs, share context, and wire up integrations across a team's full agent fleet (why this week: v2026.722.0 shipped with multi-agent workspace views and org-level quota controls; sustained 78k stars and actively trending)
6. TencentCloud/TencentDB-Agent-Memory — Team-level memory hub for AI agents that turns conversations, docs, and code into four reusable memory assets (Chat Memory, Skill, LLM-Wiki, Code-Graph) shared across frameworks (why this week: added MCP server compatibility and cross-framework sync in latest push; 5,388 stars this week)
7. corsairdev/corsair — TypeScript integration layer with 70+ plugin packages that normalizes auth, token refresh, webhook verification, and rate limiting across third-party APIs so agents never touch raw API keys (why this week: Product Hunt launch and daily.dev feature drove a spike; 2,800 stars this week)

## C/C++

1. opa334/Dopamine — Semi-untethered, rootless jailbreak for iOS 15–26 using a Momentarius PPL bypass on A12/A13 chips (why this week: Dopamine 3.0 dropped Aug 7 with the first public jailbreak for iOS 26.0 and 26.0.1, 326 days after iOS 26 launched; covered by MacRumors and TechSpot)
2. cactus-compute/cactus — Quantization, kernels, runtime, and inference engine for running LLMs on mobiles, wearables, smart home devices, and robots (why this week: companion to the Needle 2 launch; supports iOS, Android, and ARM embedded targets; 5,757 stars total and actively trending)
3. 0xShug0/audio.cpp — All-in-one pure C++ inference engine for audio models (TTS, STT, VAD, voice conversion, music generation) powered by ggml with no Python dependency and a native WebUI (why this week: Release 0.6 WIP on Aug 11 added 5 new model families — DotTTS, NeuTTS, MuScriptor, MiniMax-H3, SenseVoice — bringing the total to 49 families and 70+ model variants)
4. microsoft/intelligent-terminal — Fork of Windows Terminal with native AI agent integration via the Agent Client Protocol, letting any ACP-compatible agent control the shell directly (why this week: v0.1 announced on the Microsoft DevBlogs commandline channel; the ACP agent hook architecture drove strong discussion on Hacker News)
5. memovai/mimiclaw — Full AI agent harness running on a bare-metal ESP32-S3 with no OS, no Linux, no Node — tool calling ReAct loop, cron scheduling, and local flash memory, connecting over WiFi to Anthropic or OpenAI (why this week: the "AI agent on a $5 chip with no OS" framing generated strong social pickup; 5,674 stars)
6. autowarefoundation/vision_pilot — Free, fully open-source L2 ADAS stack powered by end-to-end AI — camera to actuator with no modular pipeline, running on standard automotive hardware (why this week: first major release milestone merged Aug 11; framed as the open alternative to Tesla FSD's architecture)

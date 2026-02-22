function FormatPreview() {
  return (
    <section className="preview animate-fade-up animate-delay-200">
      <div className="container">
        <h2 className="section-intro">What you'll receive</h2>

        <article className="email-card ">
          <p className="email-subject">
            Can you read this: Bash command validation
          </p>

          <pre className="code-block"><code>{`def _validate_command(command: str) -> list[str]:
    issues = []
    for pattern, message in _VALIDATION_RULES:
        if re.search(pattern, command):
            issues.append(message)
    return issues

def main():
    input_data = json.load(sys.stdin)

    if input_data.get("tool_name") != "Bash":
        sys.exit(0)

    command = input_data.get("tool_input", {}).get("command")
    issues = _validate_command(command)

    if issues:
        for msg in issues:
            print(f"• {msg}", file=sys.stderr)
        sys.exit(2)  # Block execution`}</code></pre>

          <div className="divider" />

          <p className="challenge">Before scrolling: what does this do?</p>

          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="breakdown-section">
            <h3 className="breakdown-title">The Breakdown</h3>
            <ul className="breakdown">
              <li>
                <strong>What it does:</strong> Validates bash commands before execution by checking them against predefined rules — reads command from stdin, applies regex patterns, and blocks execution if issues are found.
              </li>
              <li>
                <strong>Key responsibility:</strong> Acts as a pre-execution gate for the Bash tool — exit code 2 blocks the command and shows validation errors to Claude, preventing problematic commands from running.
              </li>
              <li>
                <strong>The clever part:</strong> Uses different exit codes for different outcomes (0 = pass, 1 = user-only error, 2 = block and notify Claude) — this creates a three-way communication channel through a simple integer.
              </li>
            </ul>
          </div>

            <div className="divider" />

          <div className="context-section">
            <h3 className="context-title">Project Context</h3>
            <p className="context">
              From Claude Code's PreToolUse hook system (<a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer">github.com/anthropics/claude-code</a>). This hook validates bash commands before Claude executes them, recommending better alternatives like ripgrep instead of grep. Part of Claude Code's extensibility layer that lets developers customize AI behavior through hooks.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default FormatPreview;

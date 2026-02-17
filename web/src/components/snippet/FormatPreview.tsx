function FormatPreview() {
  return (
    <section className="preview animate-fade-up animate-delay-200">
      <div className="container">
        <p className="section-intro">Every issue looks like this</p>
        <article className="email-card card">
          <p className="email-subject">
            Can you read this #012: Command resolution with fallback
          </p>

          <pre className="code-block"><code>{`def resolve_command(tokens, commands):
    prefix, *args = tokens
    matches = [c for c in commands
               if c.name.startswith(prefix)]

    if len(matches) == 1:
        return matches[0].execute(args)

    exact = [c for c in matches if c.name == prefix]
    if exact:
        return exact[0].execute(args)

    raise AmbiguousCommandError(prefix, matches)`}</code></pre>

          <p className="challenge">Before scrolling: what does this do?</p>

          <div className="breakdown-section">
            <h3 className="breakdown-title">The Breakdown</h3>
            <ul className="breakdown">
              <li>
                <strong>What it does:</strong> Resolves a user's input to a command using prefix matching — type "st" to run "status" if it's the only match.
              </li>
              <li>
                <strong>Key responsibility:</strong> Handles the ambiguity problem — when multiple commands share a prefix, falls back to exact match before raising an error.
              </li>
              <li>
                <strong>The clever part:</strong> The two-pass strategy (prefix → exact) means "status" still works even when "stash" exists — users get autocomplete-like behavior without a separate autocomplete system.
              </li>
            </ul>
          </div>

          <div className="context-section">
            <h3 className="context-title">Project Context</h3>
            <p className="context">
              From a CLI framework's command dispatcher. This pattern appears in tools like Git, npm, and Docker CLI — letting users type the shortest unambiguous prefix of any command.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default FormatPreview;

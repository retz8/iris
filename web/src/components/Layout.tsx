import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <span className="brand-mark">&gt;_ Snippet</span>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
}

export default Layout;

function enforceChatHistoryFinalBudget(params: { 
  messages: StandardMessage[]; 
  maxBytes: number 
}): { messages: StandardMessage[]; placeholderCount: number } {
  const { messages, maxBytes } = params;
  if (messages.length === 0) return { messages, placeholderCount: 0 };

  let currentBytes = jsonUtf8Bytes(messages);
  if (currentBytes <= maxBytes) return { messages, placeholderCount: 0 };

  const result = [...messages];
  let placeholderCount = 0;

  while (result.length > 1 && currentBytes > maxBytes) {
    const removed = result.splice(1, 1)[0];
    placeholderCount++;
    currentBytes -= jsonUtf8Bytes(removed);
  }

  if (currentBytes > maxBytes && result.length > 0) {
    const last = result[0];
    const overhead = jsonUtf8Bytes({ ...last, content: '' });
    const available = Math.max(0, maxBytes - overhead);
    last.content = last.content.substring(0, available);
    last.truncated = true;
  }

  return { messages: result, placeholderCount };
}
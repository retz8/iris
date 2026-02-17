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

import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <div className="brand-mark">
            <img src="/logo.svg" alt="" aria-hidden="true" className="brand-logo" />
            <span>Snippet</span>
          </div>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
}

export default Layout;

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { WEBHOOK_BASE } from '../config/webhooks';

type ConfirmState =
  | 'verifying'
  | 'confirmed'
  | 'already_confirmed'
  | 'expired'
  | 'not_found'
  | 'missing_token'
  | 'server_error';

function getNextDeliveryDay(): string {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (today === 0 || today === 1) return 'Monday';
  if (today === 2 || today === 3) return 'Wednesday';
  return 'Monday'; // Thu/Fri/Sat → next Monday
}

function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  // Lazy-initialize from URL: avoids spinner flash on missing token (TASK-041)
  const [confirmState, setConfirmState] = useState<ConfirmState>(() =>
    searchParams.get('token') ? 'verifying' : 'missing_token'
  );
  const [email, setEmail] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setConfirmState('missing_token');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    (async () => {
      try {
        const res = await fetch(`${WEBHOOK_BASE}/confirm?token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (data.success) {
          setEmail(data.email ?? null);
          if (data.message?.toLowerCase().includes('already')) {
            setConfirmState('already_confirmed');
          } else {
            setConfirmState('confirmed');
          }
        } else {
          switch (data.error_type) {
            case 'token_expired':
              setConfirmState('expired');
              break;
            case 'token_not_found':
              setConfirmState('not_found');
              break;
            default:
              setConfirmState('server_error');
          }
        }
      } catch {
        setConfirmState('server_error');
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchParams, retryCount]);

  const handleRetry = () => {
    setConfirmState('verifying');
    setRetryCount((c) => c + 1);
  };

  if (confirmState === 'verifying') {
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content">
              <div className="confirmation-spinner" role="status" aria-label="Verifying subscription" />
              <p className="confirmation-loading-text">Confirming your subscription...</p>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (confirmState === 'confirmed') {
    const nextDelivery = getNextDeliveryDay();
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content animate-fade-up">
              <div className="confirmation-status-icon confirmation-icon-success" aria-hidden="true">✓</div>
              <h1>You're confirmed!</h1>
              <p className="confirmation-text">
                {email && <><strong>{email}</strong> — </>}
                Your first Snippet arrives {nextDelivery} at 7am.
              </p>
              <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (confirmState === 'already_confirmed') {
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content animate-fade-up">
              <div className="confirmation-status-icon confirmation-icon-success" aria-hidden="true">✓</div>
              <h1>You're already subscribed to Snippet!</h1>
              {email && (
                <p className="confirmation-text">
                  <strong>{email}</strong> is already on the list.
                </p>
              )}
              <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (confirmState === 'expired') {
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content animate-fade-up">
              <div className="confirmation-status-icon confirmation-icon-warning" aria-hidden="true">⏱</div>
              <h1>Link expired</h1>
              <p className="confirmation-text">
                This link has expired. Confirmation links are valid for 48 hours.
              </p>
              <Link to="/snippet" className="confirmation-action-btn">Sign up again</Link>
              <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (confirmState === 'not_found') {
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content animate-fade-up">
              <div className="confirmation-status-icon confirmation-icon-error" aria-hidden="true">✕</div>
              <h1>Invalid link</h1>
              <p className="confirmation-text">
                Invalid or already-used confirmation link.
              </p>
              <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (confirmState === 'missing_token') {
    return (
      <Layout>
        <section className="confirmation-page">
          <div className="container">
            <div className="confirmation-content animate-fade-up">
              <div className="confirmation-status-icon confirmation-icon-error" aria-hidden="true">✕</div>
              <h1>Invalid link</h1>
              <p className="confirmation-text">
                Invalid confirmation link. Please use the link from your email.
              </p>
              <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // server_error
  return (
    <Layout>
      <section className="confirmation-page">
        <div className="container">
          <div className="confirmation-content animate-fade-up">
            <div className="confirmation-status-icon confirmation-icon-error" aria-hidden="true">!</div>
            <h1>Something went wrong</h1>
            <p className="confirmation-text">
              We couldn't confirm your subscription. Please try again.
            </p>
            <button onClick={handleRetry} className="button button-full-width confirmation-retry-btn">
              Try again
            </button>
            <Link to="/snippet" className="confirmation-home-link">Go to homepage</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default ConfirmationPage;

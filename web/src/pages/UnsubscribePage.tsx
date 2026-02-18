import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { WEBHOOK_BASE } from '../config/webhooks';

type UnsubscribeState =
  | 'confirm_prompt'
  | 'submitting'
  | 'success'
  | 'already_unsubscribed'
  | 'missing_token'
  | 'not_confirmed'
  | 'token_not_found'
  | 'server_error';

function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  // Lazy-initialize from URL: avoids confirm_prompt flash on missing token (TASK-046)
  const [unsubState, setUnsubState] = useState<UnsubscribeState>(() =>
    searchParams.get('token') ? 'confirm_prompt' : 'missing_token'
  );
  const [email, setEmail] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // TASK-033: track mount state to prevent updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // TASK-046: missing token → skip API, immediately show error
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setUnsubState('missing_token');
    }
  }, [searchParams]);

  const handleUnsubscribe = async () => {
    const token = searchParams.get('token');
    if (!token) return;

    setUnsubState('submitting');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${WEBHOOK_BASE}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!isMountedRef.current) return;

      if (data.success) {
        setEmail(data.email ?? null);
        if (data.message?.toLowerCase().includes('already')) {
          setUnsubState('already_unsubscribed');
        } else {
          setUnsubState('success');
        }
      } else {
        switch (data.error_type) {
          case 'not_confirmed':
            setUnsubState('not_confirmed');
            break;
          case 'token_not_found':
            setUnsubState('token_not_found');
            break;
          default:
            setUnsubState('server_error');
        }
      }
    } catch {
      if (isMountedRef.current) setUnsubState('server_error');
    } finally {
      clearTimeout(timeout);
    }
  };

  if (unsubState === 'success') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>You're unsubscribed</h1>
              <p className="unsubscribe-text">
                {email ? <>Sorry to see <strong>{email}</strong> go.</> : 'Sorry to see you go.'}{' '}
                You can resubscribe anytime.
              </p>
              <Link to="/snippet" className="resubscribe-link">Resubscribe</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (unsubState === 'already_unsubscribed') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>Already unsubscribed</h1>
              <p className="unsubscribe-text">
                {email ? <><strong>{email}</strong> is already</> : 'You are already'} unsubscribed from Snippet.
              </p>
              <Link to="/snippet" className="resubscribe-link">Resubscribe</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (unsubState === 'missing_token') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>Invalid link</h1>
              <p className="unsubscribe-text">
                Invalid unsubscribe link. Please use the link from your email.
              </p>
              <Link to="/snippet" className="resubscribe-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (unsubState === 'not_confirmed') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>Unable to unsubscribe</h1>
              <p className="unsubscribe-text">
                This subscription was never confirmed and cannot be unsubscribed.
              </p>
              <Link to="/snippet" className="resubscribe-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (unsubState === 'token_not_found') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>Invalid link</h1>
              <p className="unsubscribe-text">
                Invalid or already-used unsubscribe link.
              </p>
              <Link to="/snippet" className="resubscribe-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (unsubState === 'server_error') {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content animate-fade-up">
              <h1>Something went wrong</h1>
              <p className="unsubscribe-text">
                We couldn't process your request. Please try again.
              </p>
              <button
                onClick={() => setUnsubState('confirm_prompt')}
                className="button button-full-width"
                style={{ marginBottom: 'var(--space-md)' }}
              >
                Try again
              </button>
              <Link to="/snippet" className="resubscribe-link">Go to homepage</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // confirm_prompt and submitting states
  return (
    <Layout>
      <section className="unsubscribe-page">
        <div className="container">
          <div className="unsubscribe-content">
            <h1>Unsubscribe from Snippet?</h1>
            <p className="unsubscribe-text">
              You'll stop receiving Snippet newsletters.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={unsubState === 'submitting'}
              className="button button-full-width"
              style={{ marginBottom: 'var(--space-md)' }}
            >
              {unsubState === 'submitting' ? 'Unsubscribing...' : 'Confirm Unsubscribe'}
            </button>
            <Link to="/snippet" className="resubscribe-link">
              Never mind, keep me subscribed
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default UnsubscribePage;

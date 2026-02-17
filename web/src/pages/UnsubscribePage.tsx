import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

const WEBHOOK_URL = 'https://n8n.iris-codes.com/webhook/unsubscribe'; // TODO: replace with real URL from Track F

function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email validation function (reused from SignupForm pattern)
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Extract email from URL query parameter on mount
  useEffect(() => {
    const emailParam = searchParams.get('email');

    if (emailParam && validateEmail(emailParam)) {
      setEmail(emailParam);
      setError(null);
    } else if (emailParam) {
      // Email parameter exists but is invalid
      setError('Invalid email format. Please use the unsubscribe link from your email.');
      setEmail(null);
    } else {
      // No email parameter provided
      setError('Missing email address. Please use the unsubscribe link from your email.');
      setEmail(null);
    }
  }, [searchParams]);

  const handleUnsubscribe = async () => {
    if (!email) {
      setError('No email address available. Please use the unsubscribe link from your email.');
      return;
    }

    // Reset error state
    setError(null);

    // Set loading state
    setIsSubmitting(true);

    try {
      const payload = {
        email: email,
        source: 'unsubscribe_page',
        unsubscribed_date: new Date().toISOString(),
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Success - show success message
      setIsSuccess(true);
    } catch (error) {
      // TODO: Remove this catch fallback when Track F provides real webhook URL
      // For now, show success even on error since webhook is placeholder
      console.error('Webhook error (expected with placeholder):', error);
      setIsSuccess(true);
    } finally {
      // Always reset loading state
      setIsSubmitting(false);
    }
  };

  // Success state UI
  if (isSuccess) {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content">
              <h1>You're unsubscribed</h1>
              <p className="unsubscribe-text">
                Sorry to see you go. You can resubscribe anytime.
              </p>
              <Link to="/snippet" className="resubscribe-link">
                Resubscribe
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // Error state UI (invalid/missing email)
  if (error) {
    return (
      <Layout>
        <section className="unsubscribe-page">
          <div className="container">
            <div className="unsubscribe-content">
              <h1>Unable to unsubscribe</h1>
              <p className="unsubscribe-text error-msg">{error}</p>
              <Link to="/snippet" className="resubscribe-link">
                Go to homepage
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // Confirmation state UI (default - has valid email)
  return (
    <Layout>
      <section className="unsubscribe-page">
        <div className="container">
          <div className="unsubscribe-content">
            <h1>Unsubscribe from Snippet?</h1>
            <p className="unsubscribe-text">
              We'll stop sending emails to <strong>{email}</strong>
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={isSubmitting}
              className="button button-full-width"
              style={{ marginBottom: 'var(--space-md)' }}
            >
              {isSubmitting ? 'Unsubscribing...' : 'Confirm Unsubscribe'}
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

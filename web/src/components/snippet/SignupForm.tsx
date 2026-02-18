import { useState, useEffect, useRef, type FormEvent } from 'react';
import { WEBHOOK_BASE } from '../../config/webhooks';

interface FormData {
  email: string;
  programmingLanguages: string[];
}

interface FormErrors {
  email?: string;
  programmingLanguages?: string;
}

// Calculate next delivery day (Mon/Wed/Fri schedule)
function getNextDeliveryDay(): string {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (today === 0 || today === 1) return 'Monday';
  if (today === 2 || today === 3) return 'Wednesday';
  return 'Monday'; // Thu/Fri/Sat → next Monday
}

// Exported for reuse in ConfirmationPage
export { getNextDeliveryDay };

function SignupForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    programmingLanguages: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLanguageInputs, setShowLanguageInputs] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request on unmount (TASK-033)
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email || !validateEmail(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address.',
      }));
      return;
    }

    setShowLanguageInputs(true);
  };

  const handleFinalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    if (formData.programmingLanguages.length === 0) {
      setErrors((prev) => ({
        ...prev,
        programmingLanguages: 'Please select at least one programming language.',
      }));
      return;
    }

    setIsSubmitting(true);

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const payload = {
        email: formData.email,
        programming_languages: formData.programmingLanguages,
        source: 'landing_page',
        subscribed_date: new Date().toISOString(),
      };

      const res = await fetch(`${WEBHOOK_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();

      if (data.success && data.status === 'pending') {
        setIsSuccess(true);
      } else if (data.success === false) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        // Unexpected response shape — treat as success
        setIsSuccess(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setSubmitError('Request timed out. Please check your connection and try again.');
      } else {
        setSubmitError('Something went wrong. Please check your connection and try again.');
      }
    } finally {
      clearTimeout(timeout);
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleProgrammingLanguageToggle = (language: string) => {
    setFormData((prev) => {
      const isSelected = prev.programmingLanguages.includes(language);
      const newLanguages = isSelected
        ? prev.programmingLanguages.filter((lang) => lang !== language)
        : [...prev.programmingLanguages, language];

      return { ...prev, programmingLanguages: newLanguages };
    });

    if (errors.programmingLanguages) {
      setErrors((prev) => ({ ...prev, programmingLanguages: undefined }));
    }
  };

  if (isSuccess) {
    return (
      <section className="subscribe">
        <div className="container">
          <div className="success-message pending-confirmation animate-fade-up">
            <div className="confirmation-icon" aria-hidden="true">✉</div>
            <h3>Check your email</h3>
            <p className="confirmation-body">
              We sent a confirmation link to <strong>{formData.email}</strong>. Click it to complete your subscription.
            </p>
            <p className="confirmation-hint">Didn't receive it? Check your spam folder.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="subscribe">
      <div className="container">
        {!showLanguageInputs ? (
          <form onSubmit={handleEmailSubmit} className="signup-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleEmailChange}
                className={errors.email ? 'error' : ''}
                required
                autoComplete="email"
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <button type="submit" className="button-full-width">
              Subscribe
            </button>

            <p className="privacy-note">No spam. Unsubscribe anytime.</p>
          </form>
        ) : (
          <form onSubmit={handleFinalSubmit} className="signup-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                readOnly
                disabled
              />
            </div>

            <fieldset className="form-group">
              <legend>
                Programming languages{' '}
                <span className="label-hint">(select at least 1)</span>
              </legend>
              <div className="option-group">
                {(['Python', 'JS/TS', 'C/C++'] as const).map((lang) => (
                  <div className="option-pill" key={lang}>
                    <input
                      type="checkbox"
                      name="programming_languages"
                      id={`pl-${lang.toLowerCase().replace(/[^a-z]/g, '')}`}
                      value={lang}
                      checked={formData.programmingLanguages.includes(lang)}
                      onChange={() => handleProgrammingLanguageToggle(lang)}
                    />
                    <label htmlFor={`pl-${lang.toLowerCase().replace(/[^a-z]/g, '')}`}>{lang}</label>
                  </div>
                ))}
              </div>
              {errors.programmingLanguages && (
                <span className="error-msg">{errors.programmingLanguages}</span>
              )}
            </fieldset>

            {submitError && (
              <p className="error-msg" role="alert">{submitError}</p>
            )}

            <button
              type="submit"
              className="button-full-width"
              disabled={isSubmitting}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              {isSubmitting ? 'Subscribing...' : 'Complete subscription'}
            </button>

            <p className="privacy-note">No spam. Unsubscribe anytime.</p>
          </form>
        )}
      </div>
    </section>
  );
}

export default SignupForm;

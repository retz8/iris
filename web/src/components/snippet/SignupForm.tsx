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

    if (!formData.email || !validateEmail(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address.',
      }));
      return;
    }

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
        api_key: import.meta.env.VITE_WEBHOOK_SECRET,
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
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
    if (submitError) setSubmitError(null);
  };

  const handleEmailClear = () => {
    setFormData((prev) => ({ ...prev, email: '' }));
    setErrors((prev) => ({ ...prev, email: undefined }));
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

  const emailInput = (
    <div className="form-group">
      <label htmlFor="email">Email</label>
      <div className="input-clearable">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleEmailChange}
          className={errors.email ? 'error' : ''}
          autoComplete="email"
        />
        {formData.email && (
          <button
            type="button"
            className="input-clear-btn"
            onClick={handleEmailClear}
            aria-label="Clear email address"
          >
            ×
          </button>
        )}
      </div>
      {errors.email && <span className="error-msg">{errors.email}</span>}
    </div>
  );

  if (isSuccess) {
    return (
      <section className="subscribe">
        <div className="container">
          <div className="success-message pending-confirmation animate-fade-up">
            <svg className="confirmation-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="32" height="32">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <h3>Check your email</h3>
            <p className="confirmation-body">
              We sent a confirmation link to<br /><strong>{formData.email}</strong>. <br/>Click it to verify your address.
            </p>
            <p className="confirmation-hint">Usually arrives in under a minute. <br/>Not there? Check your spam folder.</p>
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
            {emailInput}

            <button type="submit" className="button-full-width">
              Send me snippets
            </button>

            <p className="privacy-note">No spam. Unsubscribe anytime.</p>
          </form>
        ) : (
          <form onSubmit={handleFinalSubmit} className="signup-form" noValidate>
            {emailInput}

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
              {isSubmitting ? 'Subscribing...' : 'Send me snippets'}
            </button>

            <p className="privacy-note">We'll match snippets to your selected languages.</p>
          </form>
        )}
      </div>
    </section>
  );
}

export default SignupForm;

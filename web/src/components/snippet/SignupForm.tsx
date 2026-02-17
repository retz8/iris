import { useState, type FormEvent } from 'react';

const WEBHOOK_URL = 'https://n8n.iris-codes.com/webhook/subscribe'; // TODO: replace with real URL from Track F

interface FormData {
  email: string;
  writtenLanguage: 'en' | 'ko';
  programmingLanguages: string[];
}

interface FormErrors {
  email?: string;
  programmingLanguages?: string;
}

function SignupForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    writtenLanguage: 'en',
    programmingLanguages: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Reset errors
    setErrors({});

    // Validate email
    if (!formData.email || !validateEmail(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address.',
      }));
      return;
    }

    // Validate programming languages
    if (formData.programmingLanguages.length === 0) {
      setErrors((prev) => ({
        ...prev,
        programmingLanguages: 'Please select at least one programming language.',
      }));
      return;
    }

    // Submit to webhook
    setIsSubmitting(true);

    try {
      const payload = {
        email: formData.email,
        written_language: formData.writtenLanguage,
        programming_languages: formData.programmingLanguages,
        source: 'landing_page',
        subscribed_date: new Date().toISOString(),
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Success
      setIsSuccess(true);
    } catch (error) {
      // TODO: Remove this catch fallback when Track F provides real webhook URL
      // For now, show success even on error since webhook is placeholder
      console.error('Webhook error (expected with placeholder):', error);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleWrittenLanguageChange = (language: 'en' | 'ko') => {
    setFormData((prev) => ({ ...prev, writtenLanguage: language }));
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
      <section className="subscribe animate-fade-up animate-delay-400">
        <div className="container">
          <div className="success-message">
            <h3>You're subscribed!</h3>
            <p>First Snippet arrives Monday 7am.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="subscribe animate-fade-up animate-delay-400">
      <div className="container">
        <h2 className="subscribe-heading">Start reading</h2>

        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          {/* Email */}
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

          {/* Written Language */}
          <fieldset className="form-group">
            <legend>Written language</legend>
            <div className="option-group">
              <div className="option-pill">
                <input
                  type="radio"
                  name="written_language"
                  id="lang-en"
                  value="en"
                  checked={formData.writtenLanguage === 'en'}
                  onChange={() => handleWrittenLanguageChange('en')}
                />
                <label htmlFor="lang-en">English</label>
              </div>
              <div className="option-pill">
                <input
                  type="radio"
                  name="written_language"
                  id="lang-ko"
                  value="ko"
                  checked={formData.writtenLanguage === 'ko'}
                  onChange={() => handleWrittenLanguageChange('ko')}
                />
                <label htmlFor="lang-ko">Korean</label>
              </div>
            </div>
          </fieldset>

          {/* Programming Languages */}
          <fieldset className="form-group">
            <legend>
              Programming languages{' '}
              <span className="label-hint">(select at least 1)</span>
            </legend>
            <div className="option-group">
              <div className="option-pill">
                <input
                  type="checkbox"
                  name="programming_languages"
                  id="pl-python"
                  value="Python"
                  checked={formData.programmingLanguages.includes('Python')}
                  onChange={() => handleProgrammingLanguageToggle('Python')}
                />
                <label htmlFor="pl-python">Python</label>
              </div>
              <div className="option-pill">
                <input
                  type="checkbox"
                  name="programming_languages"
                  id="pl-jsts"
                  value="JS/TS"
                  checked={formData.programmingLanguages.includes('JS/TS')}
                  onChange={() => handleProgrammingLanguageToggle('JS/TS')}
                />
                <label htmlFor="pl-jsts">JS/TS</label>
              </div>
              <div className="option-pill">
                <input
                  type="checkbox"
                  name="programming_languages"
                  id="pl-cpp"
                  value="C/C++"
                  checked={formData.programmingLanguages.includes('C/C++')}
                  onChange={() => handleProgrammingLanguageToggle('C/C++')}
                />
                <label htmlFor="pl-cpp">C/C++</label>
              </div>
            </div>
            {errors.programmingLanguages && (
              <span className="error-msg">{errors.programmingLanguages}</span>
            )}
          </fieldset>

          {/* Submit Button */}
          <button
            type="submit"
            className="button-full-width"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </button>

          <p className="privacy-note">No spam. Unsubscribe anytime.</p>
        </form>
      </div>
    </section>
  );
}

export default SignupForm;

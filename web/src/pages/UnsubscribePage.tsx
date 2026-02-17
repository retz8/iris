import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

function UnsubscribePage() {
  return (
    <Layout>
      <section className="unsubscribe-page">
        <div className="container">
          <div className="unsubscribe-content">
            <h1>You're unsubscribed from Snippet.</h1>
            <p className="unsubscribe-text">You won't receive any more emails from us.</p>
            <Link to="/snippet" className="resubscribe-link">
              Changed your mind? Resubscribe
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default UnsubscribePage;

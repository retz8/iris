import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

function UnsubscribePage() {
  return (
    <Layout>
      <div>
        <h1>You're unsubscribed from Snippet.</h1>
        <p>You won't receive any more emails from us.</p>
        <Link to="/snippet">Changed your mind? Resubscribe</Link>
      </div>
    </Layout>
  );
}

export default UnsubscribePage;

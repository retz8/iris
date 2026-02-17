import Layout from '../components/Layout';
import Hero from '../components/snippet/Hero';
import FormatPreview from '../components/snippet/FormatPreview';
import SignupForm from '../components/snippet/SignupForm';
import Footer from '../components/snippet/Footer';

function SnippetPage() {
  return (
    <Layout>
      <Hero />
      <FormatPreview />
      <SignupForm />
      <Footer />
    </Layout>
  );
}

export default SnippetPage;

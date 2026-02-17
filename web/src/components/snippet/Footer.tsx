import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Link to="/snippet/unsubscribe" className="footer-link">
          Unsubscribe
        </Link>
      </div>
    </footer>
  );
}

export default Footer;

import { Link } from 'react-router-dom';
import { BrandMark } from './Icon.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandMark size={30} />
          <div>
            <strong>صيدلية برو</strong>
            <span>منصة صيدلية واستشارات طبية</span>
          </div>
        </div>
        <nav className="footer-links" aria-label="روابط سريعة">
          <Link to="/medicines">الأدوية</Link>
          <Link to="/messages">الرسائل</Link>
          <Link to="/">الرئيسية</Link>
        </nav>
        <span className="footer-copy">© {new Date().getFullYear()} صيدلية برو. جميع الحقوق محفوظة.</span>
      </div>
    </footer>
  );
}

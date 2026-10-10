import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon, { BrandMark } from './Icon.jsx';

const DASHBOARD_BY_ROLE = {
  patient: '/dashboard/patient',
  pharmacy: '/dashboard/pharmacy',
  doctor: '/dashboard/doctor',
  delivery: '/dashboard/delivery',
  admin: '/dashboard/admin',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setMenuOpen(false);
    logout();
    // نقله مباشرة إلى /login بعد تنظيف الجلسة
    // استخدم window.location لتجنب أي تعارض مع الـ React state بعد مسح التوكن
    window.location.replace('/login');
  }

  function handleNavClick() {
    setMenuOpen(false);
  }

  return (
    <header className="topbar">
      <NavLink to="/" className="brand" onClick={handleNavClick}>
        <BrandMark size={36} />
        صيدلية برو
      </NavLink>

      <button
        className="nav-toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={menuOpen}
      >
        <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
      </button>

      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/medicines" onClick={handleNavClick} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name="search" size={17} />
          الأدوية
        </NavLink>
        {(!user || user.role === 'patient') && (
          <NavLink to="/cart" onClick={handleNavClick} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name="cart" size={17} />
            السلة
            {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
          </NavLink>
        )}
        {user && (
          <NavLink to="/messages" onClick={handleNavClick} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name="message" size={17} />
            الرسائل
          </NavLink>
        )}
        {user && (
          <NavLink
            to={DASHBOARD_BY_ROLE[user.role]}
            onClick={handleNavClick}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon name="dashboard" size={17} />
            لوحتي
          </NavLink>
        )}
        {!user && (
          <>
            <NavLink
              to="/register-pharmacy"
              onClick={handleNavClick}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon name="store" size={17} />
              سجّل صيدليتك
            </NavLink>
            <NavLink to="/login" onClick={handleNavClick} className={({ isActive }) => (isActive ? 'active' : '')}>
              تسجيل الدخول
            </NavLink>
            <NavLink to="/register" onClick={handleNavClick} className="nav-cta">
              إنشاء حساب
            </NavLink>
          </>
        )}
        {user && (
          <button onClick={handleLogout}>
            <Icon name="logout" size={17} />
            خروج ({user.full_name?.split(' ')[0]})
          </button>
        )}
      </nav>
    </header>
  );
}

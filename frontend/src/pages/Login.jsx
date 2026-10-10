import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

const DASHBOARD_BY_ROLE = {
  patient: '/dashboard/patient',
  pharmacy: '/dashboard/pharmacy',
  doctor: '/dashboard/doctor',
  delivery: '/dashboard/delivery',
  admin: '/dashboard/admin',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // المسار الذي حاول المستخدم الوصول إليه قبل إعادة توجيهه لتسجيل الدخول
  const redirectFrom = location.state?.from;
  const justRegistered = Boolean(location.state?.registered);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      navigate(redirectFrom || (DASHBOARD_BY_ROLE[loggedInUser.role] ?? '/'), { replace: true });
    } catch (err) {
      setError(err.message);
      // UX أفضل: امسح كلمة المرور عند الفشل وركز عليها
      setForm((f) => ({ ...f, password: '' }));
      setTimeout(() => document.getElementById('login-password')?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="page-header">
        <div>
          <h1>مرحبًا بعودتك</h1>
          <p>سجّل الدخول للمتابعة إلى صيدلية برو</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        {justRegistered && !error && (
          <div className="form-success">
            <Icon name="check" size={16} />
            تم إنشاء حسابك بنجاح. سجّل الدخول للمتابعة.
          </div>
        )}
        {error && (
          <div className="form-error">
            <Icon name="alert" size={16} />
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="login-email">البريد الإلكتروني</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">كلمة المرور</label>
          <div className="field-password">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !form.email || !form.password}>
          {submitting ? 'جارِ الدخول…' : 'دخول'}
        </button>
      </form>
      <div className="auth-foot-link">
        ليس لديك حساب؟ <Link to="/register">إنشاء حساب مريض/طبيب/مندوب</Link>
      </div>
      <div className="auth-foot-link">
        تمتلك صيدلية؟ <Link to="/register-pharmacy">سجّل صيدليتك الآن</Link>
      </div>
    </div>
  );
}

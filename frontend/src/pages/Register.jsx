import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';

const initialForm = {
  role: 'patient',
  full_name: '',
  email: '',
  phone: '',
  password: '',
  specialty: '',
  license_number: '',
  clinic_address: '',
  vehicle_type: '',
  service_area: '',
};

const ROLE_OPTIONS = [
  { value: 'patient', label: 'مريض', icon: 'user' },
  { value: 'doctor', label: 'طبيب', icon: 'doctor' },
  { value: 'delivery', label: 'مندوب توصيل', icon: 'truck' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors([]);
    setSubmitting(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || []);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card" style={{ maxWidth: 460 }}>
      <div className="page-header">
        <div>
          <h1>إنشاء حساب</h1>
          <p>
            لأصحاب الصيدليات: <Link to="/register-pharmacy">سجّل صيدليتك من هنا</Link>
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="form-error" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={16} />
              {error}
            </span>
            {errors.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
                {errors.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="field">
          <label>نوع الحساب</label>
          <div className="role-toggle">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`role-toggle-btn ${form.role === opt.value ? 'active' : ''}`}
                onClick={() => update('role', opt.value)}
              >
                <Icon name={opt.icon} size={16} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>الاسم الكامل</label>
          <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
        </div>
        <div className="field">
          <label>البريد الإلكتروني</label>
          <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <div className="field">
          <label>رقم الهاتف</label>
          <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div className="field">
          <label>كلمة المرور (٨ أحرف على الأقل)</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
        </div>

        {form.role === 'doctor' && (
          <>
            <div className="field">
              <label>التخصص</label>
              <input value={form.specialty} onChange={(e) => update('specialty', e.target.value)} />
            </div>
            <div className="field">
              <label>رقم الترخيص</label>
              <input value={form.license_number} onChange={(e) => update('license_number', e.target.value)} />
            </div>
            <div className="field">
              <label>عنوان العيادة</label>
              <input value={form.clinic_address} onChange={(e) => update('clinic_address', e.target.value)} />
            </div>
          </>
        )}

        {form.role === 'delivery' && (
          <>
            <div className="field">
              <label>نوع المركبة</label>
              <input
                placeholder="دراجة نارية، سيارة…"
                value={form.vehicle_type}
                onChange={(e) => update('vehicle_type', e.target.value)}
              />
            </div>
            <div className="field">
              <label>منطقة الخدمة</label>
              <input value={form.service_area} onChange={(e) => update('service_area', e.target.value)} />
            </div>
          </>
        )}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'جارِ الإنشاء…' : 'إنشاء الحساب'}
        </button>
      </form>
      <div className="auth-foot-link">
        لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
      </div>
    </div>
  );
}

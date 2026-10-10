import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, checkImage, IMAGE_ACCEPT } from '../api/client.js';
import Icon from '../components/Icon.jsx';

export default function RegisterPharmacy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pharmacy_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    license_number: '',
  });
  const [exteriorImage, setExteriorImage] = useState(null);
  const [interiorImage, setInteriorImage] = useState(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const redirectTimer = useRef(null);

  // لا نترك مؤقّت التحويل يعمل بعد مغادرة الصفحة
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  function pickImage(file, setter) {
    const problem = checkImage(file);
    if (problem) {
      setError(problem);
      setter(null);
      return;
    }
    setError('');
    setter(file || null);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors([]);
    if (!exteriorImage || !interiorImage) {
      setError('يرجى إرفاق صورتي واجهة وداخل الصيدلية.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      fd.append('exterior_image', exteriorImage);
      fd.append('interior_image', interiorImage);

      await api.postForm('/auth/register-pharmacy', fd);
      setSuccess('تم إرسال طلبك بنجاح! سيتم إشعارك بعد مراجعة الإدارة والتوثيق.');
      redirectTimer.current = setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || []);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card" style={{ maxWidth: 480 }}>
      <div className="page-header">
        <div>
          <h1>تسجيل صيدلية</h1>
          <p>سيُراجع فريقنا الطلب ويوثّق الصيدلية قبل ظهورها للمرضى.</p>
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
        {success && (
          <div className="form-success">
            <Icon name="check" size={16} />
            {success}
          </div>
        )}

        <div className="field">
          <label>اسم الصيدلية</label>
          <input required value={form.pharmacy_name} onChange={(e) => update('pharmacy_name', e.target.value)} />
        </div>
        <div className="field">
          <label>اسم المالك</label>
          <input required value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} />
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
          <label>العنوان</label>
          <input required value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className="field">
          <label>رقم الترخيص (اختياري)</label>
          <input value={form.license_number} onChange={(e) => update('license_number', e.target.value)} />
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
        <div className="field">
          <label>صورة واجهة الصيدلية</label>
          <input
            className="file-field"
            type="file"
            accept={IMAGE_ACCEPT}
            required
            onChange={(e) => pickImage(e.target.files[0], setExteriorImage)}
          />
        </div>
        <div className="field">
          <label>صورة داخل الصيدلية</label>
          <input
            className="file-field"
            type="file"
            accept={IMAGE_ACCEPT}
            required
            onChange={(e) => pickImage(e.target.files[0], setInteriorImage)}
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting || Boolean(success)}>
          {submitting ? 'جارِ الإرسال…' : 'إرسال الطلب'}
        </button>
      </form>
    </div>
  );
}

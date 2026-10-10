import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, checkImage, IMAGE_ACCEPT } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ImagePreview from '../components/ImagePreview.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

export default function PatientDashboard() {
  const [pharmacies, setPharmacies] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ target_role: 'pharmacy', target_id: '', notes: '' });
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileKey, setFileKey] = useState(0); // لتفريغ حقل الملف بعد الإرسال

  function pickImage(file) {
    const problem = checkImage(file);
    if (problem) {
      setError(problem);
      setImage(null);
      return;
    }
    setError('');
    setImage(file || null);
  }

  async function loadAll() {
    setError('');
    try {
      const [pharm, docs, mine, myOrders] = await Promise.all([
        api.get('/directory/pharmacies'),
        api.get('/directory/doctors'),
        api.get('/prescriptions/mine'),
        api.get('/orders/mine'),
      ]);
      setPharmacies(pharm.data.pharmacies);
      setDoctors(docs.data.doctors);
      setPrescriptions(mine.data.prescriptions);
      setOrders(myOrders.data.orders);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل البيانات.');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const targets = form.target_role === 'pharmacy' ? pharmacies : doctors;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!image) {
      setError('يرجى إرفاق صورة الروشتة.');
      return;
    }
    if (!form.target_id) {
      setError('يرجى اختيار الجهة المستلمة.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('target_role', form.target_role);
      fd.append('target_id', form.target_id);
      fd.append('notes', form.notes);
      fd.append('prescription_image', image);
      await api.postForm('/prescriptions', fd);
      setSuccess('تم إرسال الروشتة بنجاح.');
      setForm({ target_role: 'pharmacy', target_id: '', notes: '' });
      setImage(null);
      setFileKey((k) => k + 1);
      loadAll();
    } catch (err) {
      if (err.silent) return;
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const activeOrders = orders.filter((o) => !['delivered', 'payment_rejected', 'cancelled'].includes(o.status)).length;
  const pendingRx = prescriptions.filter((p) => p.status === 'pending').length;

  return (
    <div className="page">
      <PageHeader
        icon="user"
        title="لوحة المريض"
        subtitle="ارفع روشتتك لصيدلية أو طبيب، تابع طلبات الشراء، وراسل مَن تتعامل معهم."
      />

      <div className="stat-cards">
        <StatCard icon="card" tone="teal" label="طلبات قيد المتابعة" value={activeOrders} />
        <StatCard icon="file" tone="amber" label="روشتات بانتظار الرد" value={pendingRx} />
        <StatCard icon="box" tone="sky" label="إجمالي الطلبات" value={orders.length} />
      </div>

      <div className="panel">
        <h2>طلبات الشراء ({orders.length})</h2>
        {orders.length === 0 ? (
          <EmptyState icon="cart" title="لا توجد طلبات بعد" text="تصفّح الأدوية وأضِف ما تحتاجه للسلة لتبدأ أول طلب.">
            <Link to="/medicines" className="btn btn-primary btn-sm">
              تصفّح الأدوية
            </Link>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصيدلية</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>إيصال التحويل</th>
                  <th>مندوب التوصيل</th>
                  <th>تواصل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.pharmacy_name}</td>
                    <td>{Number(o.total_amount).toLocaleString('ar-SD')} جنيه</td>
                    <td>
                      <StatusBadge status={o.status} />
                      {o.status === 'payment_rejected' && o.rejection_reason && (
                        <div className="muted">{o.rejection_reason}</div>
                      )}
                    </td>
                    <td>
                      <ImagePreview path={o.payment_proof_image} alt="إيصال التحويل" />
                    </td>
                    <td>{o.delivery_name || '—'}</td>
                    <td>
                      <Link to={`/messages/${o.pharmacy_id}?name=${encodeURIComponent(o.pharmacy_name)}`}>
                        راسل الصيدلية
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>رفع روشتة جديدة</h2>
        {error && (
          <div className="form-error">
            <Icon name="alert" size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="form-success">
            <Icon name="check" size={16} />
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="field">
              <label>إرسال إلى</label>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value, target_id: '' })}
              >
                <option value="pharmacy">صيدلية</option>
                <option value="doctor">طبيب</option>
              </select>
            </div>
            <div className="field">
              <label>{form.target_role === 'pharmacy' ? 'الصيدلية' : 'الطبيب'}</label>
              <select value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
                <option value="">اختر…</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.pharmacy_name || t.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>ملاحظات (اختياري)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="field">
            <label>صورة الروشتة</label>
            <input
              className="file-field"
              key={fileKey}
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(e) => pickImage(e.target.files[0])}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            <Icon name="upload" size={16} />
            {submitting ? 'جارِ الإرسال…' : 'إرسال الروشتة'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>روشتاتي</h2>
        {prescriptions.length === 0 ? (
          <EmptyState icon="file" title="لم ترفع أي روشتة بعد" text="ارفع روشتتك أعلاه لتظهر هنا مع حالتها." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>مرسلة إلى</th>
                  <th>الحالة</th>
                  <th>ملاحظات</th>
                  <th>الصورة</th>
                  <th>تواصل</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.target_name}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>{p.notes || '—'}</td>
                    <td>
                      <ImagePreview path={p.image_path} alt="صورة الروشتة" />
                    </td>
                    <td>
                      <Link to={`/messages/${p.target_id}?name=${encodeURIComponent(p.target_name)}`}>راسل</Link>
                    </td>
                    <td>{new Date(p.created_at).toLocaleDateString('ar-SD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

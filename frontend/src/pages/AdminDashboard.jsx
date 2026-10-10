import { useEffect, useState } from 'react';
import { api, checkImage, IMAGE_ACCEPT } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ImagePreview from '../components/ImagePreview.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

const ROLE_LABELS = { patient: 'مريض', doctor: 'طبيب', pharmacy: 'صيدلية', delivery: 'مندوب توصيل' };

const emptyPharmacyForm = {
  pharmacy_name: '',
  owner_name: '',
  email: '',
  phone: '',
  address: '',
  license_number: '',
  password: '',
};

export default function AdminDashboard() {
  const [pharmacies, setPharmacies] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState(emptyPharmacyForm);
  const [exteriorImage, setExteriorImage] = useState(null);
  const [interiorImage, setInteriorImage] = useState(null);
  const [createError, setCreateError] = useState('');
  const [createErrors, setCreateErrors] = useState([]);
  const [createResult, setCreateResult] = useState(null);
  const [creating, setCreating] = useState(false);
  const [fileKey, setFileKey] = useState(0); // لتفريغ حقلي الصور بعد الإنشاء

  async function loadAll() {
    setError('');
    try {
      const [pharm, allUsers] = await Promise.all([
        api.get('/admin/pharmacies/pending'),
        api.get('/admin/users'),
      ]);
      setPharmacies(pharm.data.pharmacies);
      setUsers(allUsers.data.users);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل البيانات.');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /** ينفّذ إجراءً على مستخدم ثم يحدّث القوائم؛ الأخطاء تظهر بدل أن تضيع صامتة. */
  async function act(path) {
    setError('');
    try {
      await api.post(path);
      await loadAll();
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تنفيذ الإجراء.');
    }
  }
  const verify = (id) => act(`/admin/users/${id}/verify`);
  const unblock = (id) => act(`/admin/users/${id}/unblock`);
  function block(id) {
    if (!confirm('هل تريد حظر هذا الحساب؟ سيفقد الوصول فورًا.')) return;
    act(`/admin/users/${id}/block`);
  }

  function pickImage(file, setter) {
    const problem = checkImage(file);
    if (problem) {
      setCreateError(problem);
      setter(null);
      return;
    }
    setCreateError('');
    setter(file || null);
  }

  function updateCreateForm(field, value) {
    setCreateForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreatePharmacy(e) {
    e.preventDefault();
    setCreateError('');
    setCreateErrors([]);
    setCreateResult(null);
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(createForm).forEach(([key, value]) => fd.append(key, value));
      if (exteriorImage) fd.append('exterior_image', exteriorImage);
      if (interiorImage) fd.append('interior_image', interiorImage);

      const res = await api.postForm('/admin/pharmacies', fd);
      setCreateResult({
        pharmacyName: createForm.pharmacy_name,
        email: createForm.email,
        password: res.data.generated_password, // null إن كان الأدمن حدّد كلمة مرور بنفسه
      });
      setCreateForm(emptyPharmacyForm);
      setExteriorImage(null);
      setInteriorImage(null);
      setFileKey((k) => k + 1);
      loadAll();
    } catch (err) {
      if (err.silent) return;
      setCreateError(err.message);
      setCreateErrors(err.errors || []);
    } finally {
      setCreating(false);
    }
  }

  const pendingPharmacies = pharmacies.filter((p) => !p.is_verified).length;
  const blockedUsers = users.filter((u) => u.status === 'blocked').length;

  return (
    <div className="page">
      <PageHeader icon="shield" title="لوحة الإدارة" subtitle="راجع طلبات الصيدليات الجديدة، ووثّق أو احظر أي حساب." />

      {error && (
        <div className="form-error">
          <Icon name="alert" size={16} />
          {error}
        </div>
      )}

      <div className="stat-cards">
        <StatCard icon="store" tone="amber" label="صيدليات بانتظار التوثيق" value={pendingPharmacies} />
        <StatCard icon="users" tone="teal" label="إجمالي المستخدمين" value={users.length} />
        <StatCard icon="alert" tone="rose" label="حسابات محظورة" value={blockedUsers} />
      </div>

      <div className="panel">
        <h2>إنشاء حساب صيدلية مباشرة</h2>
        <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
          يُنشأ الحساب نشطًا وموثّقًا فورًا، دون المرور بمراجعة التسجيل الذاتي.
        </p>
        {createError && (
          <div className="form-error" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={16} />
              {createError}
            </span>
            {createErrors.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
                {createErrors.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {createResult && (
          <div className="form-success" style={{ alignItems: 'flex-start' }}>
            <Icon name="check" size={16} style={{ marginTop: 2 }} />
            <span>
              تم إنشاء حساب صيدلية «{createResult.pharmacyName}» بنجاح.
              {createResult.password && (
                <>
                  {' '}
                  كلمة المرور المولَّدة: <strong>{createResult.password}</strong> — سلّمها لصاحب الصيدلية الآن، لن تظهر
                  مرة أخرى.
                </>
              )}
            </span>
          </div>
        )}
        <form onSubmit={handleCreatePharmacy}>
          <div className="grid-2">
            <div className="field">
              <label>اسم الصيدلية</label>
              <input
                required
                value={createForm.pharmacy_name}
                onChange={(e) => updateCreateForm('pharmacy_name', e.target.value)}
              />
            </div>
            <div className="field">
              <label>اسم المالك</label>
              <input
                required
                value={createForm.owner_name}
                onChange={(e) => updateCreateForm('owner_name', e.target.value)}
              />
            </div>
            <div className="field">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => updateCreateForm('email', e.target.value)}
              />
            </div>
            <div className="field">
              <label>رقم الهاتف</label>
              <input required value={createForm.phone} onChange={(e) => updateCreateForm('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>العنوان</label>
              <input
                required
                value={createForm.address}
                onChange={(e) => updateCreateForm('address', e.target.value)}
              />
            </div>
            <div className="field">
              <label>رقم الترخيص (اختياري)</label>
              <input
                value={createForm.license_number}
                onChange={(e) => updateCreateForm('license_number', e.target.value)}
              />
            </div>
            <div className="field">
              <label>كلمة المرور (اختياري — تُولَّد تلقائيًا إن تُركت فارغة)</label>
              <input
                type="password"
                minLength={8}
                value={createForm.password}
                onChange={(e) => updateCreateForm('password', e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>صورة واجهة الصيدلية (اختياري)</label>
              <input
                className="file-field"
                key={fileKey}
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => pickImage(e.target.files[0], setExteriorImage)}
              />
            </div>
            <div className="field">
              <label>صورة داخل الصيدلية (اختياري)</label>
              <input
                className="file-field"
                key={fileKey}
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => pickImage(e.target.files[0], setInteriorImage)}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            <Icon name="plus" size={16} />
            {creating ? 'جارِ الإنشاء…' : 'إنشاء حساب الصيدلية'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>الصيدليات ({pharmacies.length})</h2>
        {pharmacies.length === 0 ? (
          <EmptyState icon="store" title="لا توجد صيدليات بعد" text="ستظهر هنا فور أن تسجّل أول صيدلية نفسها." />
        ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الصيدلية</th>
                <th>المالك</th>
                <th>الهاتف</th>
                <th>الصور</th>
                <th>التوثيق</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pharmacies.map((p) => (
                <tr key={p.id}>
                  <td>{p.pharmacy_name}</td>
                  <td>{p.owner_name}</td>
                  <td>{p.phone}</td>
                  <td>
                    <div className="actions">
                      <ImagePreview path={p.exterior_image} alt="واجهة الصيدلية" emptyLabel="بدون صورة" />
                      <ImagePreview path={p.interior_image} alt="داخل الصيدلية" emptyLabel="بدون صورة" />
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={p.is_verified ? 'verified' : 'pending'} />
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <div className="actions">
                      {!p.is_verified && (
                        <button className="btn btn-primary btn-sm" onClick={() => verify(p.id)}>
                          توثيق
                        </button>
                      )}
                      {p.status === 'blocked' ? (
                        <button className="btn btn-outline btn-sm" onClick={() => unblock(p.id)}>
                          إلغاء الحظر
                        </button>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => block(p.id)}>
                          حظر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div className="panel">
        <h2>كل المستخدمين ({users.length})</h2>
        {users.length === 0 ? (
          <EmptyState icon="users" title="لا يوجد مستخدمون بعد" />
        ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الدور</th>
                <th>التوثيق</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>
                    <StatusBadge status={u.is_verified ? 'verified' : 'pending'} />
                  </td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td>
                    <div className="actions">
                      {!u.is_verified && (
                        <button className="btn btn-primary btn-sm" onClick={() => verify(u.id)}>
                          توثيق
                        </button>
                      )}
                      {u.status === 'blocked' ? (
                        <button className="btn btn-outline btn-sm" onClick={() => unblock(u.id)}>
                          إلغاء الحظر
                        </button>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => block(u.id)}>
                          حظر
                        </button>
                      )}
                    </div>
                  </td>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ImagePreview from '../components/ImagePreview.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

const emptyMedicine = { medicine_name: '', description: '', price: '', quantity: '' };

export default function PharmacyDashboard() {
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState({});
  const [editing, setEditing] = useState(null); // {id, price, quantity}
  const [form, setForm] = useState(emptyMedicine);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setError('');
    try {
      const [meds, rx, ord, dlv] = await Promise.all([
        api.get('/medicines/mine'),
        api.get('/prescriptions/incoming'),
        api.get('/orders/incoming'),
        api.get('/directory/deliveries'),
      ]);
      setMedicines(meds.data.medicines);
      setPrescriptions(rx.data.prescriptions);
      setOrders(ord.data.orders);
      setDeliveries(dlv.data.deliveries);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل البيانات.');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAddMedicine(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/medicines', form);
      setForm(emptyMedicine);
      loadAll();
    } catch (err) {
      if (err.silent) return;
      setError([err.message, ...(err.errors || [])].join(' — '));
    } finally {
      setSubmitting(false);
    }
  }

  /** ينفّذ إجراءً ثم يحدّث البيانات؛ أي خطأ يظهر للمستخدم بدل أن يضيع كـ unhandled rejection. */
  async function run(action) {
    setError('');
    try {
      await action();
      await loadAll();
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تنفيذ الإجراء.');
    }
  }

  const toggleAvailability = (medicine) =>
    run(() => api.put(`/medicines/${medicine.id}`, { is_available: medicine.is_available ? 0 : 1 }));

  function removeMedicine(id) {
    if (!confirm('هل تريد حذف هذا الدواء من المخزون؟')) return;
    run(() => api.delete(`/medicines/${id}`));
  }

  const updateRxStatus = (id, status) => run(() => api.patch(`/prescriptions/${id}/status`, { status }));

  const confirmPayment = (orderId) => run(() => api.patch(`/orders/${orderId}/status`, { status: 'preparing' }));

  function rejectPayment(orderId) {
    const reason = prompt('سبب رفض الدفع (سيظهر للمريض):', 'لم يتم التحقق من الإيصال المرفق.');
    if (reason === null) return;
    run(() => api.patch(`/orders/${orderId}/status`, { status: 'payment_rejected', rejection_reason: reason }));
  }

  function sendOut(orderId) {
    const deliveryId = selectedDelivery[orderId];
    run(() =>
      api.patch(`/orders/${orderId}/status`, {
        status: 'out_for_delivery',
        ...(deliveryId ? { delivery_id: Number(deliveryId) } : {}),
      })
    );
  }

  const markDeliveredDirectly = (orderId) => run(() => api.patch(`/orders/${orderId}/status`, { status: 'delivered' }));

  // تعديل السعر/الكمية (لم تكن هناك أي واجهة لإعادة تعبئة المخزون أو تغيير السعر)
  function startEdit(m) {
    setEditing({ id: m.id, price: String(m.price), quantity: String(m.quantity) });
  }

  function saveEdit() {
    const { id, price, quantity } = editing;
    run(async () => {
      await api.put(`/medicines/${id}`, { price: Number(price), quantity: Number(quantity) });
      setEditing(null);
    });
  }

  const pendingOrders = orders.filter((o) => o.status === 'payment_review').length;
  const pendingRx = prescriptions.filter((p) => p.status === 'pending').length;
  const availableCount = medicines.filter((m) => m.is_available && m.quantity > 0).length;

  return (
    <div className="page">
      <PageHeader
        icon="store"
        title="لوحة الصيدلية"
        subtitle="أدر مخزون الأدوية، وراجع طلبات الشراء والروشتات الواردة من المرضى."
      />

      {error && (
        <div className="form-error">
          <Icon name="alert" size={16} />
          {error}
        </div>
      )}

      <div className="stat-cards">
        <StatCard icon="card" tone="amber" label="بانتظار مراجعة الدفع" value={pendingOrders} />
        <StatCard icon="file" tone="rose" label="روشتات بانتظار الرد" value={pendingRx} />
        <StatCard icon="pill" tone="teal" label="أدوية متاحة الآن" value={availableCount} hint={`من أصل ${medicines.length}`} />
      </div>

      <div className="panel">
        <h2>طلبات الشراء ({orders.length})</h2>
        {orders.length === 0 ? (
          <EmptyState icon="card" title="لا توجد طلبات شراء حاليًا" text="ستظهر هنا فور أن يطلب أحد المرضى الشراء من صيدليتك." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المريض</th>
                  <th>العناصر</th>
                  <th>الإجمالي</th>
                  <th>إيصال التحويل</th>
                  <th>الحالة</th>
                  <th>تواصل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.patient_name}
                      <div className="muted">{o.patient_phone}</div>
                      <div className="muted">{o.delivery_address}</div>
                    </td>
                    <td>
                      {o.items.map((it) => (
                        <div key={it.id}>
                          {it.medicine_name} × {it.quantity}
                        </div>
                      ))}
                    </td>
                    <td>{Number(o.total_amount).toLocaleString('ar-SD')}</td>
                    <td>
                      <ImagePreview path={o.payment_proof_image} alt="إيصال التحويل" />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                      {o.delivery_name && <div className="muted">المندوب: {o.delivery_name}</div>}
                    </td>
                    <td>
                      <Link to={`/messages/${o.patient_id}?name=${encodeURIComponent(o.patient_name)}`}>راسل المريض</Link>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div className="actions actions-col">
                      {o.status === 'payment_review' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => confirmPayment(o.id)}>
                            تأكيد الدفع
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectPayment(o.id)}>
                            رفض الدفع
                          </button>
                        </>
                      )}
                      {o.status === 'preparing' && (
                        <>
                          <select
                            value={selectedDelivery[o.id] || ''}
                            onChange={(e) => setSelectedDelivery({ ...selectedDelivery, [o.id]: e.target.value })}
                          >
                            <option value="">توصيل ذاتي (بدون مندوب)</option>
                            {deliveries.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.full_name} {d.vehicle_type ? `(${d.vehicle_type})` : ''}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={() => sendOut(o.id)}>
                            إرسال للتوصيل
                          </button>
                        </>
                      )}
                      {o.status === 'out_for_delivery' && !o.delivery_id && (
                        <button className="btn btn-primary btn-sm" onClick={() => markDeliveredDirectly(o.id)}>
                          تم التسليم
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
        <h2>إضافة دواء</h2>
        <form onSubmit={handleAddMedicine}>
          <div className="grid-2">
            <div className="field">
              <label>اسم الدواء</label>
              <input
                required
                value={form.medicine_name}
                onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>السعر (جنيه)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label>الكمية</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="field">
              <label>وصف (اختياري)</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            <Icon name="plus" size={16} />
            {submitting ? 'جارِ الإضافة…' : 'إضافة إلى المخزون'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>مخزون الأدوية ({medicines.length})</h2>
        {medicines.length === 0 ? (
          <EmptyState icon="pill" title="لم تُضِف أي دواء بعد" text="استخدم النموذج أعلاه لإضافة أول دواء لمخزونك." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const isEditing = editing?.id === m.id;
                  return (
                    <tr key={m.id}>
                      <td>{m.medicine_name}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={{ width: 100 }}
                            value={editing.price}
                            onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                          />
                        ) : (
                          Number(m.price).toLocaleString('ar-SD')
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            style={{ width: 80 }}
                            value={editing.quantity}
                            onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                          />
                        ) : (
                          m.quantity
                        )}
                      </td>
                      <td>
                        <StatusBadge status={m.is_available && m.quantity > 0 ? 'active' : 'blocked'} />
                        {m.quantity === 0 && <div className="muted">نفدت الكمية</div>}
                      </td>
                      <td>
                        <div className="actions">
                          {isEditing ? (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                                حفظ
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => startEdit(m)}>
                                تعديل
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => toggleAvailability(m)}>
                                {m.is_available ? 'إخفاء' : 'إظهار'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => removeMedicine(m.id)}>
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>الروشتات الواردة ({prescriptions.length})</h2>
        {prescriptions.length === 0 ? (
          <EmptyState icon="file" title="لا توجد روشتات واردة حاليًا" text="الروشتات التي يوجّهها المرضى لصيدليتك تظهر هنا." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المريض</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>الصورة</th>
                  <th>تواصل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.patient_name}</td>
                    <td>{p.patient_phone}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <ImagePreview path={p.image_path} alt="صورة الروشتة" />
                    </td>
                    <td>
                      <Link to={`/messages/${p.patient_id}?name=${encodeURIComponent(p.patient_name)}`}>راسل</Link>
                    </td>
                    <td>
                      <div className="actions">
                      {p.status === 'pending' && (
                        <button className="btn btn-outline btn-sm" onClick={() => updateRxStatus(p.id, 'reviewed')}>
                          تمت المراجعة
                        </button>
                      )}
                      {p.status !== 'completed' && (
                        <button className="btn btn-primary btn-sm" onClick={() => updateRxStatus(p.id, 'completed')}>
                          إنهاء
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

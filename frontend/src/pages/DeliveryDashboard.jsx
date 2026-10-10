import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get('/orders/assigned');
      setOrders(res.data.orders);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markDelivered(id) {
    setError('');
    try {
      await api.patch(`/orders/${id}/status`, { status: 'delivered' });
      await load();
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحديث الطلب.');
      load(); // قد تكون حالة الطلب تغيّرت، نحدّث القائمة
    }
  }

  const active = orders.filter((o) => o.status === 'out_for_delivery');
  const done = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="page">
      <PageHeader icon="truck" title="لوحة التوصيل" subtitle="الطلبات المُسندة إليك من الصيدليات." />

      {error && <div className="form-error">{error}</div>}

      <div className="stat-cards">
        <StatCard icon="truck" tone="amber" label="قيد التوصيل الآن" value={active.length} />
        <StatCard icon="check" tone="teal" label="تم تسليمها" value={done.length} />
      </div>

      <div className="panel">
        <h2>طلبات قيد التوصيل ({active.length})</h2>
        {active.length === 0 ? (
          <EmptyState icon="truck" title="لا توجد طلبات قيد التوصيل حاليًا" text="ستظهر هنا فور أن تُسند إليك صيدلية طلبًا." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصيدلية</th>
                  <th>المريض</th>
                  <th>هاتف المريض</th>
                  <th>عنوان التوصيل</th>
                  <th>الإجمالي</th>
                  <th>تواصل</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {active.map((o) => (
                  <tr key={o.id}>
                    <td>{o.pharmacy_name}</td>
                    <td>{o.patient_name}</td>
                    <td>{o.patient_phone}</td>
                    <td>{o.delivery_address}</td>
                    <td>{Number(o.total_amount).toLocaleString('ar-SD')}</td>
                    <td>
                      <Link to={`/messages/${o.patient_id}?name=${encodeURIComponent(o.patient_name)}`}>راسل المريض</Link>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => markDelivered(o.id)}>
                        <Icon name="check" size={14} />
                        تم التسليم
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>طلبات تم تسليمها ({done.length})</h2>
        {done.length === 0 ? (
          <EmptyState icon="clock" title="لا يوجد سجل تسليمات بعد" text="كل طلب تسلّمه بنجاح سيظهر هنا." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصيدلية</th>
                  <th>المريض</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {done.map((o) => (
                  <tr key={o.id}>
                    <td>{o.pharmacy_name}</td>
                    <td>{o.patient_name}</td>
                    <td>{Number(o.total_amount).toLocaleString('ar-SD')}</td>
                    <td>
                      <StatusBadge status={o.status} />
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

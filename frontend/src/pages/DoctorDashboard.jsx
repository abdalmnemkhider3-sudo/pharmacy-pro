import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ImagePreview from '../components/ImagePreview.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

export default function DoctorDashboard() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.get('/prescriptions/incoming');
      setPrescriptions(res.data.prescriptions);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل البيانات.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    setError('');
    try {
      await api.patch(`/prescriptions/${id}/status`, { status });
      await load();
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحديث الحالة.');
    }
  }

  const pendingCount = prescriptions.filter((p) => p.status === 'pending').length;

  return (
    <div className="page">
      <PageHeader icon="doctor" title="لوحة الطبيب" subtitle="راجع الروشتات والاستشارات المرسلة إليك من المرضى." />

      {error && <div className="form-error">{error}</div>}

      <div className="stat-cards">
        <StatCard icon="file" tone="amber" label="بانتظار المراجعة" value={pendingCount} />
        <StatCard icon="box" tone="teal" label="إجمالي الروشتات" value={prescriptions.length} />
      </div>

      <div className="panel">
        <h2>الروشتات الواردة ({prescriptions.length})</h2>
        {prescriptions.length === 0 ? (
          <EmptyState icon="file" title="لا توجد روشتات واردة حاليًا" text="الروشتات التي يوجّهها المرضى إليك تظهر هنا." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المريض</th>
                  <th>الهاتف</th>
                  <th>ملاحظات</th>
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
                    <td>{p.notes || '—'}</td>
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
                        <button className="btn btn-outline btn-sm" onClick={() => updateStatus(p.id, 'reviewed')}>
                          تمت المراجعة
                        </button>
                      )}
                      {p.status !== 'completed' && (
                        <button className="btn btn-primary btn-sm" onClick={() => updateStatus(p.id, 'completed')}>
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

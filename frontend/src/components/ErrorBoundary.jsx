import { Component } from 'react';
import Icon from './Icon.jsx';

/**
 * شبكة أمان أخيرة: أي خطأ غير متوقع في الواجهة (مثل محاولة قراءة خاصية من
 * قيمة null نتيجة استجابة غير متوقعة من الخادم) يُعرض كشاشة عربية قابلة
 * للتعافي بدل صفحة بيضاء فارغة بلا تفسير.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('خطأ غير متوقع في الواجهة:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app-shell">
        <div className="page" style={{ maxWidth: 460, margin: '72px auto' }}>
          <div className="panel" style={{ textAlign: 'center', padding: '44px 24px' }}>
            <span className="empty-icon" style={{ width: 60, height: 60 }}>
              <Icon name="alert" size={28} />
            </span>
            <h1 style={{ fontSize: '1.4rem', margin: '14px 0 6px' }}>حدث خطأ غير متوقع</h1>
            <p className="muted" style={{ marginBottom: 20 }}>
              تعذّر عرض هذه الصفحة. أعد تحميلها، وإن تكرر الخطأ تأكد أن خادم الخلفية يعمل بشكل صحيح.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <Icon name="arrow" size={16} />
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      </div>
    );
  }
}

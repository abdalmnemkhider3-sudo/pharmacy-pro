import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** يعرض صورة مصغّرة محمية (تُجلب بالتوكن) مع رابط لفتحها بحجمها الكامل في تبويب جديد. */
export default function ImagePreview({ path, alt, emptyLabel = 'لا توجد صورة' }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    let objectUrl = null;
    setSrc(null);
    setFailed(false);

    api
      .blob(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!path) return <span className="muted">{emptyLabel}</span>;
  if (failed) return <span className="muted">تعذّر تحميل الصورة</span>;
  if (!src) return <span className="muted">جارِ التحميل…</span>;

  return (
    <a href={src} target="_blank" rel="noreferrer" className="thumb-link">
      <img src={src} alt={alt} className="thumb" />
    </a>
  );
}

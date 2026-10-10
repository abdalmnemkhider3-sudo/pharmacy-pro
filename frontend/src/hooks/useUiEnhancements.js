import { useEffect } from 'react';

let idCounter = 0;

/**
 * تحسينات عامة للواجهة تُطبَّق تلقائيًا على كل الصفحات دون تكرار الكود:
 *  1) وسم خلايا الجداول data-label من عناوين الأعمدة، فيعرضها CSS كبطاقات مقروءة على الجوال.
 *  2) ربط كل <label> بحقله (htmlFor/id) داخل .field — يحسّن إمكانية الوصول ويجعل الضغط على الاسم يركّز الحقل.
 * تعدّل الخصائص فقط (لا تضيف/تحذف عقدًا) فلا تُطلق المراقب من جديد.
 */
export default function useUiEnhancements() {
  useEffect(() => {
    let frame = null;

    function apply() {
      frame = null;
      document.querySelectorAll('table').forEach((table) => {
        const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || '');
          });
        });
      });

      document.querySelectorAll('.field').forEach((field) => {
        const label = field.querySelector(':scope > label:not([for])');
        const control = field.querySelector('input:not([type=hidden]), select, textarea');
        if (!label || !control) return;
        if (!control.id) control.id = `field-${++idCounter}`;
        label.setAttribute('for', control.id);
      });
    }

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
}

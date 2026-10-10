<?php

namespace Support;

class Validator
{
    /** أسماء الحقول بالعربية لتظهر رسائل الخطأ مفهومة للمستخدم بدل أسماء الأعمدة التقنية */
    private const LABELS = [
        'full_name'        => 'الاسم الكامل',
        'email'            => 'البريد الإلكتروني',
        'phone'            => 'رقم الهاتف',
        'password'         => 'كلمة المرور',
        'role'             => 'نوع الحساب',
        'pharmacy_name'    => 'اسم الصيدلية',
        'owner_name'       => 'اسم المالك',
        'address'          => 'العنوان',
        'license_number'   => 'رقم الترخيص',
        'medicine_name'    => 'اسم الدواء',
        'description'      => 'الوصف',
        'price'            => 'السعر',
        'quantity'         => 'الكمية',
        'receiver_id'      => 'المستلم',
        'message_text'     => 'نص الرسالة',
        'prescription_id'  => 'الروشتة',
        'target_role'      => 'نوع الجهة المستلمة',
        'target_id'        => 'الجهة المستلمة',
        'notes'            => 'الملاحظات',
        'payment_details'  => 'بيانات الدفع',
        'status'           => 'الحالة',
    ];

    /**
     * @param array $data   البيانات المطلوب فحصها
     * @param array $rules  ['field' => 'required|email'] مثلاً
     *                      القواعد: required, email, min:N, max:N (أحرف)، numeric, integer, gte:N, lte:N, in:a,b,c
     * @return array قائمة رسائل الأخطاء (فارغة إن كانت البيانات صحيحة)
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $value = $data[$field] ?? null;
            $label = self::LABELS[$field] ?? $field;
            $fieldRules = explode('|', $ruleString);

            // مصفوفة/كائن بدل قيمة نصية (مثل email[]=x) → قيمة غير صالحة، ولا نكمل بقية القواعد
            if (is_array($value)) {
                $errors[] = "قيمة حقل «{$label}» غير صالحة.";
                continue;
            }

            // نتجاهل المسافات الزائدة بداية/نهاية القيمة عند الفحص فقط (لا نُعدّل $data الأصلية
            // التي يستخدمها المتحكم لاحقًا)، فمسافة عرضية من النسخ أو لوحة مفاتيح الجوال لا تجعل
            // بريدًا صحيحًا يُرفض كـ"بريد غير صالح" مثلًا. نستثني كلمة المرور عمدًا: مسافاتها جزء
            // من القيمة الفعلية التي تُجزَّأ (hash) وتُقارن بها لاحقًا دون أي تعديل.
            if (is_string($value) && stripos($field, 'password') === false) {
                $value = trim($value);
            }

            foreach ($fieldRules as $rule) {
                [$ruleName, $ruleParam] = array_pad(explode(':', $rule, 2), 2, null);

                if ($ruleName === 'required' && ($value === null || $value === '' || (is_string($value) && trim($value) === ''))) {
                    $errors[] = "حقل «{$label}» مطلوب.";
                    break;
                }
                if ($value === null || $value === '') {
                    continue; // باقي القواعد لا تُطبَّق على حقل فارغ غير مطلوب
                }
                if ($ruleName === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "حقل «{$label}» يجب أن يكون بريدًا إلكترونيًا صحيحًا.";
                }
                if ($ruleName === 'min' && mb_strlen((string) $value) < (int) $ruleParam) {
                    $errors[] = "حقل «{$label}» يجب ألا يقل عن $ruleParam أحرف.";
                }
                if ($ruleName === 'max' && mb_strlen((string) $value) > (int) $ruleParam) {
                    $errors[] = "حقل «{$label}» يجب ألا يزيد عن $ruleParam حرفًا.";
                }
                if ($ruleName === 'numeric' && (!is_numeric($value) || is_bool($value))) {
                    $errors[] = "حقل «{$label}» يجب أن يكون رقمًا.";
                }
                if ($ruleName === 'integer' && (is_bool($value) || filter_var($value, FILTER_VALIDATE_INT) === false)) {
                    $errors[] = "حقل «{$label}» يجب أن يكون عددًا صحيحًا.";
                }
                if ($ruleName === 'gte' && is_numeric($value) && (float) $value < (float) $ruleParam) {
                    $errors[] = "حقل «{$label}» يجب ألا يقل عن $ruleParam.";
                }
                if ($ruleName === 'lte' && is_numeric($value) && (float) $value > (float) $ruleParam) {
                    $errors[] = "حقل «{$label}» يجب ألا يزيد عن $ruleParam.";
                }
                if ($ruleName === 'in' && !in_array((string) $value, explode(',', $ruleParam), true)) {
                    $errors[] = "قيمة حقل «{$label}» غير مسموح بها.";
                }
            }
        }

        return $errors;
    }
}

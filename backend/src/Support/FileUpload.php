<?php

namespace Support;

class FileUpload
{
    /**
     * يتحقق من ملف مرفوع ويخزّنه باسم عشوائي آمن.
     * يفحص نوع المحتوى الفعلي (وليس امتداد الاسم القادم من المستخدم) لمنع رفع ملفات تنفيذية.
     *
     * @return string اسم الملف المخزَّن (وليس المسار الكامل)
     * @throws \RuntimeException برسالة عربية مناسبة للعرض للمستخدم
     */
    public static function storeImage(array $file, string $prefix): string
    {
        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            // حد php.ini الافتراضي 2MB وقد يكون أقل من حدّنا (5MB)، فنذكر الحد الفعلي
            throw new \RuntimeException('حجم الملف يتجاوز الحد المسموح (' . ini_get('upload_max_filesize') . ').');
        }
        if ($error !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null)) {
            throw new \RuntimeException('فشل رفع الملف.');
        }
        if ($file['size'] > MAX_UPLOAD_BYTES) {
            throw new \RuntimeException('حجم الملف يتجاوز الحد المسموح (5MB).');
        }

        $mime = null;
        if (extension_loaded('fileinfo')) {
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: null;
        }
        if (!$mime) {
            $info = @getimagesize($file['tmp_name']);
            $mime = is_array($info) ? ($info['mime'] ?? null) : null;
        }

        if (!$mime || !isset(ALLOWED_IMAGE_TYPES[$mime])) {
            throw new \RuntimeException('نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WEBP.');
        }

        $extension = ALLOWED_IMAGE_TYPES[$mime];
        $filename = $prefix . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
        $destination = UPLOAD_DIR . $filename;

        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('تعذّر حفظ الملف على السيرفر.');
        }

        return $filename;
    }

    /**
     * يحذف ملفًا مرفوعًا (يُستخدم للتنظيف عندما يفشل الطلب بعد رفع الصورة،
     * حتى لا تتراكم ملفات يتيمة في مجلد uploads). يقبل null بأمان.
     */
    public static function delete(?string $filename): void
    {
        if (!$filename || !preg_match('/^[A-Za-z0-9_\-]+\.[A-Za-z]{3,4}$/', $filename)) {
            return;
        }
        $path = UPLOAD_DIR . $filename;
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

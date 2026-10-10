<?php
/**
 * يحمّل متغيرات البيئة من ملف .env (إن وُجد) ويوفّرها عبر env().
 * لا يعتمد على أي مكتبة خارجية.
 */

if (!function_exists('load_env_file')) {
    function load_env_file(string $path): void
    {
        if (!is_file($path)) {
            return;
        }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $key = trim($key);
            $value = trim($value);
            // إزالة علامات الاقتباس المحيطة بالقيمة (KEY="value")
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && substr($value, -1) === $value[0]) {
                $value = substr($value, 1, -1);
            }
            if ($key !== '' && getenv($key) === false) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

if (!function_exists('env')) {
    function env(string $key, $default = null)
    {
        $value = getenv($key);
        return $value === false ? $default : $value;
    }
}

load_env_file(__DIR__ . '/../.env');

// إعدادات جاهزة للاستخدام في كل مكان
define('APP_DEBUG', filter_var(env('APP_DEBUG', 'false'), FILTER_VALIDATE_BOOLEAN));
define('JWT_SECRET', env('JWT_SECRET', 'insecure-default-change-me'));
define('JWT_TTL_HOURS', (int) env('JWT_TTL_HOURS', 12));
define('FRONTEND_ORIGIN', env('FRONTEND_ORIGIN', 'http://localhost:5173'));
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp']);

if (APP_DEBUG) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
}

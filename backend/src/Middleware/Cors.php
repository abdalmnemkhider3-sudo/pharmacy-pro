<?php

namespace Middleware;

class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $allowed = array_values(array_filter(array_map('trim', explode(',', FRONTEND_ORIGIN)), 'strlen'));

        // قبول المصادر المحلية تلقائيًا في وضع التطوير فقط (أي منفذ يختاره Vite).
        // في الإنتاج لا يُسمح إلا بالمصادر المذكورة في FRONTEND_ORIGIN.
        $isLocalOrigin = APP_DEBUG && preg_match(
            '#^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$#i',
            $origin
        );

        if ($origin !== '' && ($isLocalOrigin || in_array($origin, $allowed, true))) {
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
        }
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}

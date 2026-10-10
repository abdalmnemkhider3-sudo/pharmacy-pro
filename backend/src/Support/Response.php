<?php

namespace Support;

class Response
{
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function ok($data = [], string $message = ''): void
    {
        self::json(array_merge(['message' => $message], is_array($data) ? ['data' => $data] : []), 200);
    }

    public static function created($data = [], string $message = 'تم الإنشاء بنجاح.'): void
    {
        self::json(['message' => $message, 'data' => $data], 201);
    }

    public static function error(string $message, int $status = 400, $extra = []): void
    {
        self::json(array_merge(['message' => $message], $extra), $status);
    }
}

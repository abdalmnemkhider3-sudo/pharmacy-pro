<?php

namespace Support;

class Db
{
    /** هل الخطأ ناتج عن مخالفة قيد UNIQUE (بريد/هاتف مكرر) — يحدث عند تسابق طلبين متزامنين. */
    public static function isDuplicate(\Throwable $e): bool
    {
        return $e instanceof \PDOException && (int) ($e->errorInfo[1] ?? 0) === 1062;
    }
}

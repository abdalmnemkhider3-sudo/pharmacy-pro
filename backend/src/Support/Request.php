<?php

namespace Support;

class Request
{
    /**
     * يقرأ جسم الطلب كـ JSON ويرجع دائمًا مصفوفة.
     * لو الجسم فارغ أو ليس JSON أو كان قيمة مفردة ("abc" / 123 / null) نرجع مصفوفة فارغة،
     * حتى لا ينهار Validator بخطأ TypeError (500) بدل رد 422 واضح.
     */
    public static function json(): array
    {
        $decoded = json_decode(file_get_contents('php://input') ?: '', true);
        return is_array($decoded) ? $decoded : [];
    }
}

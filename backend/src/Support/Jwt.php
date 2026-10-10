<?php

namespace Support;

/**
 * تنفيذ خفيف لتوكن JWT بخوارزمية HS256، بدون أي مكتبة خارجية.
 */
class Jwt
{
    public static function issue(array $payload, int $ttlHours = 12): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $now = time();
        $payload = array_merge($payload, [
            'iat' => $now,
            'exp' => $now + ($ttlHours * 3600),
        ]);

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_UNICODE)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE)),
        ];
        $signature = hash_hmac('sha256', implode('.', $segments), JWT_SECRET, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /** يرجع payload كمصفوفة عند النجاح، أو null إن كان التوكن غير صالح/منتهي. */
    public static function verify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $actualSignature = self::base64UrlDecode($signatureB64);
        if ($actualSignature === null) {
            return null; // توقيع بحروف غير صالحة (كان يسبب TypeError → 500)
        }
        $expectedSignature = hash_hmac('sha256', "$headerB64.$payloadB64", JWT_SECRET, true);
        if (!hash_equals($expectedSignature, $actualSignature)) {
            return null;
        }

        $payloadJson = self::base64UrlDecode($payloadB64);
        $payload = $payloadJson === null ? null : json_decode($payloadJson, true);
        if (!is_array($payload) || !isset($payload['exp'], $payload['sub']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): ?string
    {
        $decoded = base64_decode(strtr($data, '-_', '+/'), true);
        return $decoded === false ? null : $decoded;
    }
}

<?php
/* Приём заявок с сайта мюзикла (корпоратив, подарочный сертификат) — хостинг reg.ru, PHP mail().
   Все формы сайта шлют сюда JSON: {kind, name, phone, details, email?, website (ловушка), page, ref, utm}.
   Ответ — JSON {"ok":true} или {"ok":false,"error":"..."}.
   Круг 5 (04.11): проверка телефона +7 и 10 цифр, Reply-To, лог вне public_html. */

const TO        = 'Club1promo@yandex.ru';          // куда приходят заявки (решение Ал 04.11)
const FROM      = 'site@metelitsaclub1.ru';        // отправитель — адрес на домене сайта (иначе почта режет как спам)
const FROM_NAME = 'Сайт «О чём молчат женщины»';
const SUBJECT   = 'Заявка с сайта шоу';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
mb_internal_encoding('UTF-8');

function answer($ok, $code = 200, $error = '') {
    http_response_code($code);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}
function clean($s, $max) {                       // одна строка без управляющих символов (защита заголовков письма)
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$s);
    return trim(mb_substr($s, 0, $max));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') answer(false, 405, 'method');

$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) $d = $_POST;                  // на случай обычной отправки формы
if (!empty($d['website'])) answer(true);          // ловушка для ботов: делаем вид, что всё хорошо

$name    = clean($d['name'] ?? '', 100);
$phone   = preg_replace('/\D/', '', (string)($d['phone'] ?? ''));
if (strlen($phone) === 11 && ($phone[0] === '7' || $phone[0] === '8')) $phone = substr($phone, 1);
if ($name === '') answer(false, 422, 'name');
if (!preg_match('/^[3-9]\d{9}$/', $phone)) answer(false, 422, 'phone');   // российский номер: +7 и 10 цифр
$phone   = '+7' . $phone;
$email   = clean($d['email'] ?? '', 120);
$email   = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
$details = mb_substr(trim((string)($d['details'] ?? '')), 0, 1000);

$kinds = ['corp' => 'Корпоратив / закрытый показ', 'gift' => 'Подарочный сертификат'];
$kind  = $kinds[$d['kind'] ?? ''] ?? 'Заявка';
$utm   = isset($d['utm']) ? json_encode($d['utm'], JSON_UNESCAPED_UNICODE) : '—';

$text = "$kind\n\n"
      . "Имя: $name\n"
      . "Телефон: $phone\n"
      . ($email ? "E-mail: $email\n" : '')
      . "Подробности: " . ($details !== '' ? $details : '—') . "\n\n"
      . "Страница: " . clean($d['page'] ?? '', 200) . "\n"
      . "Откуда пришёл: " . clean($d['ref'] ?? '', 300) . "\n"
      . "Метка рекламы: " . clean($utm, 500) . "\n"
      . "Время: " . date('d.m.Y H:i') . " (сервер)\n";

$enc = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };
$headers  = "From: " . $enc(FROM_NAME) . " <" . FROM . ">\r\n";
if ($email) $headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
$ok = @mail(TO, $enc(SUBJECT . ": $kind"), $text, $headers, '-f' . FROM);

/* лог заявок: сначала папка рядом с корнем сайта (вне public_html), иначе — закрытая папка рядом со скриптом */
$line = date('c') . "\t" . ($ok ? 'sent' : 'FAIL') . "\t" . str_replace(["\r", "\n"], [' ', ' | '], $text) . "\n";
$dirs = [];
if (!empty($_SERVER['DOCUMENT_ROOT'])) $dirs[] = dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/')) . '/molchat-leads';
$dirs[] = __DIR__ . '/_leads';
foreach ($dirs as $dir) {
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    if (is_dir($dir) && is_writable($dir)) {
        if (strpos($dir, __DIR__) === 0 && !file_exists("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\nDeny from all\n");
        @file_put_contents("$dir/leads.log", $line, FILE_APPEND | LOCK_EX);
        break;
    }
}

$ok ? answer(true) : answer(false, 500, 'mail');

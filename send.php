<?php
/**
 * Приём заявки на аренду площадки.
 *
 * До этого форма на arenda.html была заглушкой: гость видел «Заявка
 * отправлена», а письмо никуда не уходило. Скрипт принимает POST с той же
 * формы и шлёт письмо в отдел мероприятий.
 *
 * Отвечает JSON: {"ok":true} либо {"ok":false,"error":"..."} с кодом 4xx/5xx.
 * Фронтенд показывает «отправлено» только по ответу 2xx.
 */

const MAIL_TO      = 'Club1promo@yandex.ru';
const MAIL_FROM    = 'noreply@club1.moscow';
const MAX_PER_HOUR = 20;     // предел с одного адреса

header('Content-Type: application/json; charset=utf-8');

// без типа возврата never — он появился только в PHP 8.1,
// а на шаред-хостинге может стоять версия постарше
function fail($code, $msg)
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Метод не поддерживается');
}

$clean = function ($key, $limit) {
    $v = isset($_POST[$key]) ? trim((string)$_POST[$key]) : '';
    $v = preg_replace('/[\r\n]+/', ' ', $v);          // защита от инъекции заголовков
    return function_exists('mb_substr') ? mb_substr($v, 0, $limit) : substr($v, 0, $limit);
};

$name    = $clean('name', 120);
$phone   = $clean('phone', 40);
$date    = $clean('date', 20);
$comment = $clean('comment', 2000);
$consent = !empty($_POST['mailing-consent']);

if ($name === '' || $phone === '') {
    fail(422, 'Заполните имя и телефон');
}
if (preg_replace('/\D+/', '', $phone) === '') {
    fail(422, 'Проверьте номер телефона');
}

// простое ограничение частоты — файл счётчика на адрес
$ip   = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$slot = sys_get_temp_dir() . '/club1_req_' . md5($ip) . '_' . date('YmdH');
$hits = is_file($slot) ? (int)file_get_contents($slot) : 0;
if ($hits >= MAX_PER_HOUR) {
    fail(429, 'Слишком много заявок подряд. Позвоните нам: +7 (499) 686 91 11');
}
file_put_contents($slot, (string)($hits + 1));

$lines = [
    'Имя: ' . $name,
    'Телефон: ' . $phone,
];
if ($date !== '')    { $lines[] = 'Дата события: ' . $date; }
if ($comment !== '') { $lines[] = 'Комментарий: ' . $comment; }
$lines[] = $consent ? 'Согласен получать анонсы клуба' : 'Анонсы — без согласия';
$lines[] = '';
$lines[] = 'Отправлено с club1.moscow/arenda, ' . date('d.m.Y H:i');

$body    = implode("\n", $lines);
$subject = '=?UTF-8?B?' . base64_encode('Заявка на аренду площадки — ' . $name) . '?=';
// Reply-To не ставим: у гостя собираем только телефон, отвечать в почту некому
$headers = implode("\r\n", [
    'From: Club1 <' . MAIL_FROM . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: club1-site',
]);

if (!mail(MAIL_TO, $subject, $body, $headers)) {
    fail(500, 'Письмо не ушло. Позвоните нам: +7 (499) 686 91 11');
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);

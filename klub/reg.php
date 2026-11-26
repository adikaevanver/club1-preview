<?php
/* Клуб гостей Метелицы — приём регистраций со страницы /klub/ (ТЗ Кузнецова 25.11, шаг 1).
   Гость: имя, телефон, стол, email?, согласия → личный код из 4 цифр на сегодня (МСК).
   Один телефон — одна регистрация за день: при повторе отдаём уже выданный код.
   Лимит по столу: если утром положен ../molchat-leads/klub-seats.json ({"vip3":6,"s27":4,…}),
   регистраций со столом за день не больше мест; без файла лимита нет.
   Журнал: ../molchat-leads/klub.log (вне веб-корня); состояние дня: klub-ГГГГ-ММ-ДД.json там же.
   Письмо на служебный ящик — когда Ал пришлёт адрес (KLUB_TO); пока пусто, только журнал. */

const KLUB_TO   = '';                               // служебный ящик (пришлёт Ал)
const FROM      = 'site@metelitsaclub1.ru';
const FROM_NAME = 'Клуб гостей Метелицы';
const DRINKS    = [];                               // шаг 2: ['c1','c2','c3','c4','c5'] — список пришлют

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Moscow');

function answer($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function clean($s, $max) { $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$s); return trim(mb_substr($s, 0, $max)); }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') answer(['ok' => false, 'error' => 'method'], 405);
$d = json_decode(file_get_contents('php://input'), true);
if (!is_array($d)) $d = $_POST;
if (!empty($d['website'])) answer(['ok' => true, 'code' => '0000']);   // ловушка для ботов

$name  = clean($d['name'] ?? '', 60);
$phone = preg_replace('/\D+/', '', (string)($d['phone'] ?? ''));
if (strlen($phone) === 11 && ($phone[0] === '8' || $phone[0] === '7')) $phone = substr($phone, 1);
$table = clean($d['table'] ?? '', 8);
$email = clean($d['email'] ?? '', 120);
$drink = clean($d['drink'] ?? '', 4);
$src   = clean($d['src'] ?? '', 30);
$cpd   = !empty($d['consent_pd']);
$cads  = !empty($d['consent_ads']);

if ($name === '')                        answer(['ok' => false, 'error' => 'Укажите имя'], 422);
if (strlen($phone) !== 10 || $phone[0] !== '9') answer(['ok' => false, 'error' => 'Проверьте номер телефона'], 422);
if (!preg_match('/^(vip([1-9]|1[0-3])|s([1-9]|[1-6][0-9]|7[01])|d[1-4]|bar)$/', $table)) answer(['ok' => false, 'error' => 'Выберите стол'], 422);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) answer(['ok' => false, 'error' => 'Проверьте email'], 422);
if (DRINKS && !in_array($drink, DRINKS, true)) answer(['ok' => false, 'error' => 'Выберите коктейль'], 422);
if (!DRINKS) $drink = '';
if (!$cpd)                               answer(['ok' => false, 'error' => 'Нужно согласие на обработку данных'], 422);

$dir = dirname(rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/..', '/')) . '/molchat-leads';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
if (!is_dir($dir) || !is_writable($dir)) answer(['ok' => false, 'error' => 'Сервис временно недоступен, обратитесь к хостес'], 503);

$day = date('Y-m-d');
$fh = fopen("$dir/klub-$day.json", 'c+');
flock($fh, LOCK_EX);
$st = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
$st += ['phones' => [], 'codes' => [], 'tables' => []];

$p7 = '+7' . $phone;
if (isset($st['phones'][$p7])) {                     // повтор: показываем уже выданный код
    $c = $st['phones'][$p7];
    flock($fh, LOCK_UN); fclose($fh);
    answer(['ok' => true, 'repeat' => true] + $st['codes'][$c]['pub']);
}

$seats = @json_decode(@file_get_contents("$dir/klub-seats.json") ?: 'null', true);
if (is_array($seats) && isset($seats[$table]) && ($st['tables'][$table] ?? 0) >= (int)$seats[$table]) {
    flock($fh, LOCK_UN); fclose($fh);
    answer(['ok' => false, 'error' => 'За этим столом все велкомы уже получены, обратитесь к хостес'], 409);
}

do { $code = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT); } while (isset($st['codes'][$code]));
$ts = date('c');
$pub = ['code' => $code, 'name' => $name, 'table' => $table, 'drink' => $drink, 'date' => date('d.m.Y')];
$st['phones'][$p7] = $code;
$st['codes'][$code] = ['pub' => $pub, 'phone' => $p7, 'ts' => $ts, 'issued' => null];
$st['tables'][$table] = ($st['tables'][$table] ?? 0) + 1;
ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($st, JSON_UNESCAPED_UNICODE));
fflush($fh); flock($fh, LOCK_UN); fclose($fh);

$fields = [
    'code' => $code, 'name' => $name, 'phone' => $p7, 'phone_verified' => 'no', 'email' => $email,
    'table' => $table, 'drink' => $drink, 'consent_pd' => 'yes', 'consent_ads' => $cads ? 'yes' : 'no',
    'src' => $src, 'ts' => $ts,
];
$text = '';
foreach ($fields as $k => $v) $text .= "$k: $v\n";
@file_put_contents("$dir/klub.log", "KLUB $code\t" . str_replace("\n", ' | ', trim($text)) . "\n", FILE_APPEND | LOCK_EX);

if (KLUB_TO !== '') {
    $enc = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };
    $headers = "From: " . $enc(FROM_NAME) . " <" . FROM . ">\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n";
    @mail(KLUB_TO, "KLUB $code", $text, $headers, '-f' . FROM);
}

answer(['ok' => true, 'repeat' => false] + $pub);

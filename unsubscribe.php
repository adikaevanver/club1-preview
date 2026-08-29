<?php
/**
 * Отписка от рассылки Club №1.
 *
 * Два входа, и разница между ними принципиальная (RFC 8058):
 *   POST — отписывает сразу. Так приходит «отписаться в один клик» из Gmail,
 *          Mail.ru и Яндекса: почтовик сам шлёт POST по адресу из заголовка
 *          List-Unsubscribe, гость видит только кнопку в интерфейсе почты.
 *   GET  — только показывает страницу с кнопкой. Отписывать по GET нельзя:
 *          сканеры безопасности и предпросмотр ссылок ходят по адресам из
 *          писем сами, и отписали бы гостей, которые ничего не нажимали.
 *
 * Адрес гостя приезжает в параметре e как base64url. Подписи у токена нет
 * намеренно: подделка даёт ровно одно — чужой адрес перестанет получать
 * афишу, это обратимо, и каждая отписка видна письмом в info@, так что
 * злоупотребление сразу заметно. Хранилища на сервере нет: отписка уходит
 * письмом, список живёт в одном месте — в почте и в suppression.txt.
 */
declare(strict_types=1);

const MAIL_TO   = 'info@metelitsaclub1.ru';
const MAIL_FROM = 'info@metelitsaclub1.ru';
const SITE      = 'https://metelitsaclub1.ru/';

function b64url_decode(string $s): string {
    $s = strtr($s, '-_', '+/');
    $pad = strlen($s) % 4;
    if ($pad) { $s .= str_repeat('=', 4 - $pad); }
    return (string) base64_decode($s, true);
}

function page(string $title, string $body, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>$t · Club №1</title>
<style>
 body{margin:0;background:#f2f2f2;font:16px/1.55 Arial,Helvetica,sans-serif;color:#222}
 .box{max-width:520px;margin:8vh auto;padding:32px 28px;background:#fff;border-radius:12px}
 h1{margin:0 0 14px;font-size:24px;line-height:1.25}
 p{margin:0 0 14px}
 .mail{font-weight:700;word-break:break-all}
 button{padding:14px 26px;background:#111;color:#fff;border:0;border-radius:8px;
        font:700 16px/1 Arial,Helvetica,sans-serif;cursor:pointer}
 a{color:#111}
 .muted{color:#777;font-size:14px}
</style></head><body><div class="box">$body</div></body></html>
HTML;
    exit;
}

$raw   = (string) ($_GET['e'] ?? $_POST['e'] ?? '');
$email = trim(b64url_decode($raw));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    page('Ссылка не распознана',
        '<h1>Ссылка не распознана</h1>'
        . '<p>Похоже, адрес отписки повреждён при пересылке письма.</p>'
        . '<p>Напишите на <a href="mailto:' . MAIL_TO . '?subject=Отписаться">' . MAIL_TO . '</a> '
        . 'словом «Отписаться» — уберём вручную.</p>', 400);
}

$safe = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $subject = '=?UTF-8?B?' . base64_encode('Отписка: ' . $email) . '?=';
    $body    = "Гость отписался от рассылки.\n\n"
             . "Адрес: {$email}\n"
             . 'Время: ' . date('Y-m-d H:i:s') . "\n"
             . 'Источник: ' . (isset($_POST['List-Unsubscribe']) ? 'один клик из почтовика' : 'кнопка на странице') . "\n";
    $headers = implode("\r\n", [
        'From: Club1 <' . MAIL_FROM . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    @mail(MAIL_TO, $subject, $body, $headers, '-f' . MAIL_FROM);

    page('Вы отписались',
        '<h1>Готово, больше не пишем</h1>'
        . '<p>Адрес <span class="mail">' . $safe . '</span> убран из рассылки Club №1.</p>'
        . '<p class="muted">Афиша клуба остаётся на сайте: <a href="' . SITE . '">metelitsaclub1.ru</a></p>');
}

page('Отписаться от рассылки',
    '<h1>Отписаться от рассылки Club №1?</h1>'
    . '<p>Адрес <span class="mail">' . $safe . '</span> перестанет получать письма с афишей.</p>'
    . '<form method="post"><input type="hidden" name="e" value="' . htmlspecialchars($raw, ENT_QUOTES, 'UTF-8') . '">'
    . '<button type="submit">Отписаться</button></form>'
    . '<p class="muted" style="margin-top:18px">Нажали случайно? Просто закройте страницу — без нажатия ничего не меняется.</p>');

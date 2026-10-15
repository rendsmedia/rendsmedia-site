<?php
/**
 * Rends Media — contact form handler.
 * Emails each enquiry to the business inbox, then sends the visitor back
 * to contact.html with a success or error message. Stores nothing.
 */

const TO_ADDRESS   = 'business@rendsmedia.com';
const FROM_ADDRESS = 'website@rendsmedia.com';   // sending address on our own domain (helps deliverability)
const MIN_SECONDS  = 3;                           // humans take longer than this to fill the form

function back(string $result): void {
    header('Location: contact.html?' . $result . '#form', true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    back('');
}

// Strip line breaks from single-line fields so they can't inject email headers.
function line(string $key, int $max): string {
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $v = trim(str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v));
    return mb_substr($v, 0, $max);
}
function block(string $key, int $max): string {
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    return mb_substr(trim(str_replace("\r\n", "\n", $v)), 0, $max);
}

// Spam checks: hidden field filled, or form sent impossibly fast. Pretend success so bots learn nothing.
$started = (int) line('started', 20);
if (line('website', 200) !== '' || ($started > 0 && (time() - intdiv($started, 1000)) < MIN_SECONDS)) {
    back('sent=1');
}

$types = [
    'impact'    => 'Impact documentation',
    'audit'     => 'Visual audit',
    'events'    => 'Event coverage',
    'corporate' => 'Corporate content',
    'other'     => 'Something else',
];

$name     = line('name', 120);
$org      = line('organisation', 160);
$email    = line('email', 160);
$phone    = line('phone', 40);
$typeKey  = line('enquiry', 20);
$location = line('location', 200);
$timing   = line('timing', 120);
$currency = line('currency', 3) === 'USD' ? 'USD' : 'UGX';
$budget   = line('budget', 40);
$sites    = line('audit_sites', 60);
$auditLoc = line('audit_locations', 200);
$message  = block('message', 5000);

if ($name === '' || $message === '' || !isset($types[$typeKey]) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    back('error=1');
}

$type = $types[$typeKey];

$lines = [
    "New enquiry from the Rends Media website",
    "",
    "Name:          $name",
    "Organisation:  " . ($org !== '' ? $org : '-'),
    "Email:         $email",
    "Phone:         " . ($phone !== '' ? $phone : '-'),
    "Needs:         $type",
];
if ($typeKey === 'audit') {
    $lines[] = "Audit sites:   " . ($sites !== '' ? $sites : '-');
    $lines[] = "Audit areas:   " . ($auditLoc !== '' ? $auditLoc : '-');
}
$lines[] = "Where:         " . ($location !== '' ? $location : '-');
$lines[] = "When:          " . ($timing !== '' ? $timing : '-');
$lines[] = "Budget guide:  " . ($budget !== '' ? "$currency $budget" : 'Not given');
$lines[] = "";
$lines[] = "Message:";
$lines[] = $message;
$lines[] = "";
$lines[] = "Reply directly to this email to answer " . $name . ".";

$subject = "Website enquiry: $type" . ($org !== '' ? " - $org" : " - $name");
$headers = [
    'From: Rends Media Website <' . FROM_ADDRESS . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

// Preferred route: send through Google Workspace (smtp.gmail.com) with an app password.
// The password lives in a file OUTSIDE the website and outside this public repo:
//   /home/rends/rends-mail-config.php  →  <?php return ['user' => 'business@rendsmedia.com', 'pass' => 'xxxx xxxx xxxx xxxx'];
$configFile = dirname(__DIR__) . '/rends-mail-config.php';
if (is_file($configFile)) {
    $cfg = include $configFile;
    $ok = is_array($cfg) && smtp_send($cfg, TO_ADDRESS, $email, $encSubject, implode("\r\n", $lines));
    back($ok ? 'sent=1' : 'error=1');
}

// Fallback: the server's own mail system.
$ok = mail(TO_ADDRESS, $encSubject, implode("\n", $lines), implode("\r\n", $headers), '-f' . FROM_ADDRESS);
back($ok ? 'sent=1' : 'error=1');

/** Minimal SMTP client for Google: SSL on 465, or STARTTLS on 587. Logs failures (no enquiry content). */
function smtp_send(array $cfg, string $to, string $replyTo, string $subject, string $body): bool {
    $user = (string) ($cfg['user'] ?? '');
    $pass = str_replace(' ', '', (string) ($cfg['pass'] ?? ''));
    $log  = dirname(__DIR__) . '/rends-mail.log';
    $fail = function (string $why) use ($log) {
        @file_put_contents($log, date('c') . ' ' . $why . "\n", FILE_APPEND);
        return false;
    };
    if ($user === '' || $pass === '') return $fail('config missing user or pass');

    $s = @stream_socket_client('ssl://smtp.gmail.com:465', $errno, $errstr, 15);
    $tls = false;
    if (!$s) {
        $s = @stream_socket_client('tcp://smtp.gmail.com:587', $errno2, $errstr2, 15);
        if (!$s) return $fail("connect failed: 465 ($errstr) / 587 ($errstr2)");
        $tls = true;
    }
    stream_set_timeout($s, 20);
    $read = function () use ($s) {
        $out = '';
        while (($l = fgets($s, 515)) !== false) { $out .= $l; if (isset($l[3]) && $l[3] === ' ') break; }
        return $out;
    };
    $cmd = function (string $c, string $expect) use ($s, $read) {
        if ($c !== '') fwrite($s, $c . "\r\n");
        $r = $read();
        return strncmp($r, $expect, 3) === 0 ? true : trim($r);
    };
    $host = 'rendsmedia.com';
    if (($r = $cmd('', '220')) !== true) return $fail("greeting: $r");
    if (($r = $cmd("EHLO $host", '250')) !== true) return $fail("ehlo: $r");
    if ($tls) {
        if (($r = $cmd('STARTTLS', '220')) !== true) return $fail("starttls: $r");
        if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) return $fail('tls handshake failed');
        if (($r = $cmd("EHLO $host", '250')) !== true) return $fail("ehlo2: $r");
    }
    if (($r = $cmd('AUTH LOGIN', '334')) !== true) return $fail("auth: $r");
    if (($r = $cmd(base64_encode($user), '334')) !== true) return $fail("auth user: $r");
    if (($r = $cmd(base64_encode($pass), '235')) !== true) return $fail("auth pass rejected: $r");
    if (($r = $cmd("MAIL FROM:<$user>", '250')) !== true) return $fail("mail from: $r");
    if (($r = $cmd("RCPT TO:<$to>", '250')) !== true) return $fail("rcpt: $r");
    if (($r = $cmd('DATA', '354')) !== true) return $fail("data: $r");

    $msg = implode("\r\n", [
        'Date: ' . date('r'),
        'From: Rends Media Website <' . $user . '>',
        'To: <' . $to . '>',
        'Reply-To: ' . $replyTo,
        'Subject: ' . $subject,
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@rendsmedia.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        rtrim(chunk_split(base64_encode($body), 76, "\r\n")),
    ]);
    if (($r = $cmd($msg . "\r\n.", '250')) !== true) return $fail("send: $r");
    $cmd('QUIT', '221');
    fclose($s);
    return true;
}

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

$ok = mail(
    TO_ADDRESS,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    implode("\n", $lines),
    implode("\r\n", $headers),
    '-f' . FROM_ADDRESS
);

back($ok ? 'sent=1' : 'error=1');

<?php
// Penerima PERMINTAAN FITUR dari tombol "Usulkan Fitur" di Asisten AI.
// Menyimpan ke feature-requests.jsonl — dibaca & dikerjakan oleh VibeCoder.
header('Content-Type: application/json');

$token = $_SERVER['HTTP_X_GAK_TOKEN'] ?? ($_GET['token'] ?? '');
if (!hash_equals('gak_feat_5b2d9e77', (string)$token)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'invalid token']);
    exit;
}

$size = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($size > 300000) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'too large']);
    exit;
}

$rl = __DIR__ . '/.last_feat';
if (file_exists($rl) && time() - (int)file_get_contents($rl) < 5) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate limited']);
    exit;
}
file_put_contents($rl, time());

$body = file_get_contents('php://input');
if ($body === false || trim($body) === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'empty']);
    exit;
}

$line = json_encode([
    'ts' => gmdate('Y-m-d H:i:s') . ' UTC',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'payload' => $body,
]) . "\n";

$f = __DIR__ . '/feature-requests.jsonl';
file_put_contents($f, $line, FILE_APPEND | LOCK_EX);

$lines = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
if (count($lines) > 200) {
    file_put_contents($f, implode("\n", array_slice($lines, -200)) . "\n");
}

echo json_encode(['ok' => true, 'stored' => 1]);

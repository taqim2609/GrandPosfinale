<?php
// Unduh arsip kompresi pos-grand.tar.gz lewat PHP.
// Arsip ini HANYA dipakai skrip update otomatis di server Pi (satu berkas untuk diunduh).
// Untuk mengambil berkas proyek satu per satu, pakai files.php / file.php (tanpa kompresi).
$ALLOW = array(
    'pos-grand.tar.gz' => 'application/gzip',
);
$f    = isset($_GET['f']) ? basename((string) $_GET['f']) : '';
$path = __DIR__ . '/' . $f;

if ($f === '' || !isset($ALLOW[$f]) || !is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Berkas tidak ditemukan. Yang tersedia: " . implode(', ', array_keys($ALLOW));
    exit;
}

while (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . $ALLOW[$f]);
header('Content-Length: ' . filesize($path));
header('Content-Disposition: attachment; filename="' . $f . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');

$fp = fopen($path, 'rb');
if (!$fp) {
    exit;
}
while (!feof($fp)) {
    $chunk = fread($fp, 262144);
    if ($chunk === false || $chunk === '') {
        break;
    }
    echo $chunk;
}
fclose($fp);

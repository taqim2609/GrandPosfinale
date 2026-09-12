<?php
// Unduh berkas arsip besar (tar / tar.gz) lewat PHP.
// Dipakai agar unduhan tidak bergantung pada jenis berkas yang disajikan server statis.
$ALLOW = array(
    'pos-grand.tar'    => 'application/x-tar',
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

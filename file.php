<?php
// Unduh SATU berkas dari arsip proyek (pos-grand.tar) — untuk mengambil berkas tertentu
// (mis. backend/server.py) tanpa mengunduh seluruh arsip.
// Daftar putih = isi arsip itu sendiri, jadi nama di luar arsip tidak mungkin terunduh.
require __DIR__ . '/tarlib.php';

$TAR = __DIR__ . '/pos-grand.tar';

function gak_file_404($msg)
{
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg;
    exit;
}

if (!is_file($TAR)) {
    gak_file_404("Arsip pos-grand.tar belum tersedia di server Update Center.\n"
        . "Halaman daftar berkas: files.php");
}

$f = isset($_GET['f']) ? (string) $_GET['f'] : '';
$f = str_replace(array("\0", '\\'), array('', '/'), $f);
$f = ltrim($f, '/');
while (substr($f, 0, 2) === './') {
    $f = substr($f, 2);
}
if ($f === '' || strpos($f, '..') !== false) {
    gak_file_404("Nama berkas tidak sah.\nHalaman daftar berkas: files.php");
}

$idx = gak_tar_index($TAR);
if (!isset($idx[$f])) {
    gak_file_404('Berkas "' . $f . "\" tidak ada di arsip versi ini.\n"
        . "Lihat daftar berkas lengkap: files.php");
}

$e      = $idx[$f];
$inline = isset($_GET['inline']) && gak_tar_is_text($f);

while (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . ($inline ? 'text/plain; charset=utf-8' : gak_tar_mime($f)));
header('Content-Length: ' . $e['size']);
header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment')
    . '; filename="' . str_replace('"', '', basename($f)) . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');
gak_tar_send($TAR, $e);

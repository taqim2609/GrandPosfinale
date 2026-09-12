<?php
// Unduh SATU berkas proyek — untuk mengambil berkas tertentu (mis. backend/server.py)
// tanpa mengunduh apa pun yang lain.
// Berkas dibaca LANGSUNG dari folder `project/` (tanpa arsip/kompresi), dan hanya
// nama yang benar-benar ada di folder itu yang bisa diunduh (daftar putih alami).
require __DIR__ . '/lib.php';

function gak_file_404($msg)
{
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg;
    exit;
}

if (!is_dir(gak_project_dir())) {
    gak_file_404("Folder proyek (project/) belum tersedia di server Update Center.\n"
        . "Halaman daftar berkas: files.php");
}

$f    = isset($_GET['f']) ? (string) $_GET['f'] : '';
$path = gak_project_path($f);

if ($path === null) {
    gak_file_404('Berkas "' . $f . "\" tidak ada di folder proyek versi ini.\n"
        . "Lihat daftar berkas lengkap: files.php");
}

$name   = basename($path);
$size   = (int) filesize($path);
$inline = isset($_GET['inline']) && gak_is_text($name);

while (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . ($inline ? 'text/plain; charset=utf-8' : gak_mime($name)));
header('Content-Length: ' . $size);
header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment')
    . '; filename="' . str_replace('"', '', $name) . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');
gak_send_file($path);

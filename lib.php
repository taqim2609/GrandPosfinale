<?php
// Utilitas Update Center — berkas proyek disajikan APA ADANYA dari folder `project/`.
//
// Sengaja TIDAK memakai arsip TAR / kompresi apa pun untuk daftar berkas: folder
// `project/` adalah salinan langsung berkas yang di-track git, jadi:
//   - files.php -> memindai folder itu untuk menampilkan daftar berkas
//   - file.php  -> mengirim satu berkas langsung dari folder itu
// Arsip `pos-grand.tar.gz` tetap ada HANYA sebagai bahan update otomatis server Pi
// (satu berkas untuk diunduh skrip update-vibecoder-pi.sh).

// Folder salinan berkas proyek.
function gak_project_dir()
{
    return __DIR__ . '/project';
}

// Daftar seluruh berkas di folder project/ (rekursif).
// Hasil: [['name' => 'backend/server.py', 'size' => 1234], ...]
function gak_project_scan($dir = null)
{
    $dir = ($dir === null) ? gak_project_dir() : $dir;
    $out = array();
    if (!is_dir($dir)) {
        return $out;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    $skip = strlen($dir) + 1;
    foreach ($it as $info) {
        if (!$info->isFile()) {
            continue;                                  // folder / symlink ke folder tidak didaftarkan
        }
        $rel = substr($info->getPathname(), $skip);
        $rel = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
        $out[] = array('name' => $rel, 'size' => (int) $info->getSize());
    }
    return $out;
}

// Ubah nama relatif (dari query string) jadi path nyata DI DALAM folder project/.
// Mengembalikan null bila nama tidak sah atau berkasnya tidak ada (anti path traversal).
function gak_project_path($rel)
{
    $base = gak_project_dir();
    $rel  = str_replace(array("\0", '\\'), array('', '/'), (string) $rel);
    $rel  = ltrim($rel, '/');
    while (substr($rel, 0, 2) === './') {
        $rel = substr($rel, 2);
    }
    if ($rel === '' || strpos($rel, '..') !== false) {
        return null;
    }
    $path = $base . '/' . $rel;
    if (!is_file($path)) {                             // is_file() menolak folder
        return null;
    }
    $real = realpath($path);
    $root = realpath($base);
    if ($real === false || $root === false) {
        return null;
    }
    if (strpos($real, $root . DIRECTORY_SEPARATOR) !== 0) {
        return null;                                   // ternyata di luar folder project/
    }
    return $real;
}

// Jenis konten berdasarkan ekstensi (untuk header unduhan).
function gak_mime($name)
{
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $map = array(
        'php' => 'text/plain; charset=utf-8', 'py' => 'text/plain; charset=utf-8',
        'js' => 'text/javascript; charset=utf-8', 'mjs' => 'text/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8', 'map' => 'application/json',
        'css' => 'text/css; charset=utf-8', 'html' => 'text/html; charset=utf-8',
        'md' => 'text/markdown; charset=utf-8', 'txt' => 'text/plain; charset=utf-8',
        'sh' => 'text/plain; charset=utf-8', 'yml' => 'text/plain; charset=utf-8',
        'yaml' => 'text/plain; charset=utf-8', 'conf' => 'text/plain; charset=utf-8',
        'ini' => 'text/plain; charset=utf-8', 'env' => 'text/plain; charset=utf-8',
        'properties' => 'text/plain; charset=utf-8', 'gradle' => 'text/plain; charset=utf-8',
        'pro' => 'text/plain; charset=utf-8', 'java' => 'text/plain; charset=utf-8',
        'kt' => 'text/plain; charset=utf-8', 'xml' => 'application/xml; charset=utf-8',
        'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
        'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon', 'apk' => 'application/vnd.android.package-archive',
        'zip' => 'application/zip', 'gz' => 'application/gzip', 'tar' => 'application/x-tar',
        'pdf' => 'application/pdf', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
        'ttf' => 'font/ttf', 'mp4' => 'video/mp4', 'wasm' => 'application/wasm',
        'keystore' => 'application/octet-stream', 'jar' => 'application/java-archive',
    );
    return isset($map[$ext]) ? $map[$ext] : 'application/octet-stream';
}

// Berkas teks (boleh ditampilkan langsung di peramban).
function gak_is_text($name)
{
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $texts = array('php', 'py', 'js', 'mjs', 'json', 'map', 'css', 'md', 'txt', 'sh', 'yml',
        'yaml', 'conf', 'ini', 'env', 'properties', 'gradle', 'pro', 'java', 'kt', 'xml',
        'html', 'htaccess', 'lock', 'log', 'csv', 'sql', 'bat', 'ps1', 'desktop', 'url', 'jsonl');
    return in_array($ext, $texts, true) || $ext === '';
}

// Ukuran berkas dalam bentuk manusiawi.
function gak_size_h($n)
{
    if ($n < 1024) {
        return $n . ' B';
    }
    if ($n < 1024 * 1024) {
        return number_format($n / 1024, 1, ',', '.') . ' KB';
    }
    return number_format($n / 1048576, 2, ',', '.') . ' MB';
}

// Kirim isi berkas ke output (mengalir — tidak dimuat seluruhnya ke memori).
function gak_send_file($path)
{
    $fp = @fopen($path, 'rb');
    if (!$fp) {
        return false;
    }
    while (!feof($fp)) {
        $chunk = fread($fp, 262144);
        if ($chunk === false || $chunk === '') {
            break;
        }
        echo $chunk;
    }
    fclose($fp);
    return true;
}

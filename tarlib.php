<?php
// Pembaca arsip TAR murni PHP — dipakai Update Center untuk:
//   - files.php : menampilkan daftar isi arsip (unduh satu per satu)
//   - file.php  : mengirim satu berkas dari dalam arsip
// Sengaja TIDAK memakai ekstensi phar (tidak selalu tersedia di hosting PHP ini).

// Baca seluruh entri (berkas biasa) dari arsip TAR.
// Mengembalikan daftar: [['name'=>..., 'offset'=>..., 'size'=>...], ...]
function gak_tar_entries($path)
{
    $out = array();
    $fp = @fopen($path, 'rb');
    if (!$fp) {
        return $out;
    }
    $longName = null;      // nama panjang (header 'L' GNU / 'x' pax)
    $longSize = null;
    while (true) {
        $hdr = fread($fp, 512);
        if ($hdr === false || strlen($hdr) < 512) {
            break;                                   // ujung berkas
        }
        if (trim($hdr, "\0") === '') {
            break;                                   // blok kosong = akhir arsip
        }
        $name   = rtrim(substr($hdr, 0, 100), "\0");
        $size   = (int) octdec(trim(substr($hdr, 124, 12), " \0"));
        $type   = substr($hdr, 156, 1);
        $prefix = rtrim(substr($hdr, 345, 155), "\0");
        if ($prefix !== '') {
            $name = $prefix . '/' . $name;           // format ustar: nama dipecah 2 kolom
        }
        $dataStart = ftell($fp);
        $pad       = (512 - ($size % 512)) % 512;

        if ($type === 'L') {                         // GNU: nama panjang
            $longName = rtrim(fread($fp, $size), "\0");
            fseek($fp, $dataStart + $size + $pad);
            continue;
        }
        if ($type === 'x' || $type === 'g') {        // pax: baris "Nama= nilai"
            $txt = fread($fp, $size);
            if (preg_match('/^[0-9]+ path=(.*)$/m', $txt, $m)) {
                $longName = rtrim($m[1], "\n");
            }
            if (preg_match('/^[0-9]+ size=(.*)$/m', $txt, $m)) {
                $longSize = (int) trim($m[1]);
            }
            fseek($fp, $dataStart + $size + $pad);
            continue;
        }
        if ($longName !== null) {
            $name = $longName;
            $longName = null;
        }
        if ($longSize !== null) {
            $size = $longSize;
            $longSize = null;
        }
        if ($type === '0' || $type === "\0" || $type === '') {   // berkas biasa
            $out[] = array('name' => $name, 'offset' => $dataStart, 'size' => $size);
        }
        fseek($fp, $dataStart + $size + $pad);
    }
    fclose($fp);
    return $out;
}

// Peta nama berkas => entri, supaya pencarian saat unduh cepat & sekaligus
// jadi daftar putih: hanya nama yang BENAR-BENAR ada di arsip yang bisa diunduh.
function gak_tar_index($path)
{
    $idx = array();
    foreach (gak_tar_entries($path) as $e) {
        $idx[$e['name']] = $e;
    }
    return $idx;
}

// Keluarkan isi satu entri ke output (mengalir, tidak dimuat seluruhnya ke memori).
function gak_tar_send($tarPath, $entry)
{
    $fp = @fopen($tarPath, 'rb');
    if (!$fp) {
        return false;
    }
    fseek($fp, $entry['offset']);
    $left = (int) $entry['size'];
    while ($left > 0 && !feof($fp)) {
        $chunk = fread($fp, $left > 262144 ? 262144 : $left);
        if ($chunk === false || $chunk === '') {
            break;
        }
        echo $chunk;
        $left -= strlen($chunk);
    }
    fclose($fp);
    return $left === 0;
}

// Jenis konten berdasarkan ekstensi (untuk header unduhan).
function gak_tar_mime($name)
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
function gak_tar_is_text($name)
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

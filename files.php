<?php
// Daftar seluruh berkas proyek di dalam arsip — bisa diunduh SATU PER SATU.
require __DIR__ . '/tarlib.php';

$TAR     = __DIR__ . '/pos-grand.tar';
$GZ      = __DIR__ . '/pos-grand.tar.gz';
$entries = is_file($TAR) ? gak_tar_entries($TAR) : array();

$ver  = '';
$upd  = '';
$vj   = __DIR__ . '/version.json';
if (is_file($vj)) {
    $j = json_decode((string) file_get_contents($vj), true);
    if (is_array($j)) {
        $ver = isset($j['version']) ? (string) $j['version'] : '';
        $upd = isset($j['updated']) ? (string) $j['updated'] : '';
    }
}

// Kelompokkan per folder teratas.
$groups = array();
$total  = 0;
foreach ($entries as $e) {
    $total += $e['size'];
    $n     = $e['name'];
    $slash = strpos($n, '/');
    $g     = ($slash === false) ? '' : substr($n, 0, $slash);
    $groups[$g][] = $e;
}
ksort($groups);
foreach ($groups as $g => $rows) {
    usort($rows, function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    $groups[$g] = $rows;
}

// Urutan kelompok: berkas akar dulu, sisanya sesuai abjad.
$order = array_keys($groups);
usort($order, function ($a, $b) {
    if ($a === '') {
        return -1;
    }
    if ($b === '') {
        return 1;
    }
    return strcmp($a, $b);
});

function h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
function stat_of($path)
{
    return is_file($path) ? gak_size_h(filesize($path)) : '—';
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Daftar Berkas Proyek — Grand Aceh Kuliner POS</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, system-ui, sans-serif;
    background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 45%, #FDF2F8 100%);
    min-height: 100vh; padding: 20px; color: #1F1B3A;
  }
  .wrap { max-width: 900px; margin: 0 auto; }
  .card {
    background: rgba(255,255,255,0.74);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.8);
    border-radius: 18px;
    box-shadow: 0 14px 38px rgba(79,70,229,0.12);
    padding: 22px 20px;
    margin-bottom: 18px;
  }
  h1 { font-size: 19px; margin-bottom: 4px; }
  .sub { color: #635F82; font-size: 13px; line-height: 1.6; }
  .ver {
    display: inline-block; background: #4F46E5; color: #fff; border-radius: 999px;
    padding: 3px 12px; font-size: 12.5px; font-weight: 700; margin: 10px 0 4px;
  }
  .btns { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  a.btn {
    display: inline-block; text-decoration: none; font-weight: 700; font-size: 13.5px;
    border-radius: 11px; padding: 10px 14px; color: #fff;
    background: linear-gradient(90deg, #4F46E5, #8B5CF6);
  }
  a.btn.ghost { background: rgba(79,70,229,0.10); color: #4F46E5; }
  .toolbar {
    position: sticky; top: 0; z-index: 5; padding-top: 10px;
    display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  }
  input[type=search] {
    flex: 1 1 220px; min-width: 180px; font-size: 14px; font-family: inherit;
    padding: 11px 13px; border-radius: 11px; color: #1F1B3A;
    border: 1px solid rgba(79,70,229,0.25); background: rgba(255,255,255,0.9);
  }
  input[type=search]:focus { outline: 2px solid rgba(79,70,229,0.35); }
  .count { color: #635F82; font-size: 12.5px; }
  h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: #4F46E5;
    margin: 20px 0 8px; display: flex; justify-content: space-between; gap: 10px;
  }
  h2 span.n { color: #8b87a8; font-weight: 600; text-transform: none; letter-spacing: 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 6px; border-bottom: 1px solid rgba(79,70,229,0.10); vertical-align: middle; }
  tr.row:hover { background: rgba(79,70,229,0.05); }
  td.p { font-size: 13px; word-break: break-all; }
  td.p .dir { color: #8b87a8; }
  td.p a { color: #2b2550; text-decoration: none; font-weight: 600; }
  td.p a:hover { color: #4F46E5; text-decoration: underline; }
  td.s { font-size: 12px; color: #635F82; white-space: nowrap; text-align: right; width: 78px; }
  td.a { white-space: nowrap; text-align: right; width: 108px; }
  td.a a {
    display: inline-block; font-size: 12px; font-weight: 700; text-decoration: none;
    border-radius: 9px; padding: 6px 9px; margin-left: 4px;
  }
  td.a a.dl { background: rgba(79,70,229,0.12); color: #4F46E5; }
  td.a a.vw { background: rgba(139,92,246,0.12); color: #7C3AED; }
  .foot { color: #8b87a8; font-size: 12px; text-align: center; margin: 6px 0 24px; }
  .foot a { color: #4F46E5; }
  .empty { color: #635F82; font-size: 13.5px; line-height: 1.7; }
  code.k { background: #1F1B3A; color: #C7D2FE; border-radius: 8px; padding: 2px 7px; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">

  <div class="card">
    <h1>Daftar Berkas Proyek</h1>
    <div class="sub">
      Semua berkas yang ada di dalam arsip rilis, bisa diunduh <b>satu per satu</b>
      (mis. <code class="k">backend/server.py</code> saja) tanpa mengunduh seluruh arsip.
      Isinya sama persis dengan yang ada di <code class="k">pos-grand.tar.gz</code>.
    </div>
    <?php if ($ver !== ''): ?>
      <div class="ver">versi: <?= h($ver) ?><?= $upd !== '' ? ' — ' . h($upd) : '' ?></div>
    <?php endif; ?>
    <div class="btns">
      <a class="btn" href="archive.php?f=pos-grand.tar.gz" download>⬇ Unduh semua (pos-grand.tar.gz <?= h(stat_of($GZ)) ?>)</a>
      <a class="btn ghost" href="archive.php?f=pos-grand.tar" download>⬇ Unduh semua (pos-grand.tar <?= h(stat_of($TAR)) ?>)</a>
      <a class="btn ghost" href="index.php">← Kembali ke Update Center</a>
    </div>
    <div class="sub" style="margin-top:10px">
      Total <b><?= count($entries) ?></b> berkas · <b><?= h(gak_size_h($total)) ?></b> isi berkas.
      Klik nama berkas untuk membaca isinya (berkas teks), atau tombol untuk mengunduh.
    </div>
  </div>

  <div class="card">
    <div class="toolbar">
      <input type="search" id="q" placeholder="Cari berkas… (mis. server.py, Reports, docker)" autocomplete="off" />
      <div class="count" id="cnt"></div>
    </div>

    <?php if (!$entries): ?>
      <div class="empty">
        Arsip <code class="k">pos-grand.tar</code> belum tersedia di server ini, jadi daftar berkas belum bisa ditampilkan.
        Silakan unduh arsip lengkapnya di halaman Update Center.
      </div>
    <?php endif; ?>

    <?php foreach ($order as $g): $rows = $groups[$g]; ?>
      <h2 data-group="<?= h($g) ?>">
        <span><?= $g === '' ? 'Berkas utama (akar proyek)' : h($g) . '/' ?></span>
        <span class="n"><?= count($rows) ?> berkas</span>
      </h2>
      <table>
        <?php foreach ($rows as $e): $n = $e['name']; $slash = strrpos($n, '/'); ?>
          <tr class="row" data-p="<?= h(strtolower($n)) ?>">
            <td class="p">
              <?php if ($slash !== false): ?>
                <span class="dir"><?= h(substr($n, 0, $slash + 1)) ?></span><?php echo h(substr($n, $slash + 1)); ?>
              <?php else: ?>
                <?= h($n) ?>
              <?php endif; ?>
            </td>
            <td class="s"><?= h(gak_size_h($e['size'])) ?></td>
            <td class="a">
              <a class="dl" href="file.php?f=<?= h(rawurlencode($n)) ?>" download>Unduh</a>
              <?php if (gak_tar_is_text($n)): ?>
                <a class="vw" href="file.php?f=<?= h(rawurlencode($n)) ?>&amp;inline=1" target="_blank" rel="noopener">Lihat</a>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </table>
    <?php endforeach; ?>
  </div>

  <div class="foot">
    Update Center Grand Aceh Kuliner POS · <a href="index.php">halaman utama</a>
  </div>
</div>

<script>
(function () {
  var q = document.getElementById('q');
  var cnt = document.getElementById('cnt');
  var rows = document.querySelectorAll('tr.row');
  var heads = document.querySelectorAll('h2[data-group]');
  var total = rows.length;

  function apply() {
    var s = (q.value || '').toLowerCase().replace(/^\s+|\s+$/g, '');
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var ok = s === '' || rows[i].getAttribute('data-p').indexOf(s) !== -1;
      rows[i].style.display = ok ? '' : 'none';
      if (ok) { shown++; }
    }
    for (var j = 0; j < heads.length; j++) {
      var g = heads[j];
      var next = g.nextElementSibling;
      var vis = 0;
      while (next && next.tagName === 'TABLE') {
        var r = next.querySelectorAll('tr.row');
        for (var k = 0; k < r.length; k++) {
          if (r[k].style.display !== 'none') { vis++; }
        }
        next = next.nextElementSibling;
      }
      g.style.display = vis > 0 ? '' : 'none';
    }
    cnt.textContent = 'Menampilkan ' + shown + ' dari ' + total + ' berkas';
  }

  q.addEventListener('input', apply);
  q.addEventListener('keyup', apply);
  apply();
})();
</script>
</body>
</html>

/* =========================================================
 * same difference — gen clip
 * G_02 weekday : 曜日ペア（実時間）
 *   L面 = カレンダー（7列×5行の枠。今日の位置にピンクのドット）黒罫・白地
 *          列＝曜日（日→土）／行＝その月の第何週か
 *   R面 = 英語3文字＋ピリオド（e.g. TUE.）白字・黒地。ピリオドはピンク
 *          グリフは assets/fonts/SD_font_EN.svg 由来
 *
 * ピンクのドットは1秒ごとに点滅し、L と R で交互に表示される
 * （同じ瞬間にはどちらか一方だけが点いている）。
 *
 * 文字組み：SVG に入っている仮想ボディ（300×630u）を単位に置く。
 * 送り幅 = 仮想ボディ幅 + その20%（= 360u）。グリフのパスはフォント座標のまま
 * 持ち、描画時に仮想ボディの左上へ原点を移して置く。
 *
 * Canvas に毎フレーム描画するライブクリップ（プリレンダなし）。
 * 呼び出し規約（display 側）: G_01_clock.js と同一。
 *   window.GEN_CLIPS["G_02"].draw(ctx, w, h, side, now)
 * ========================================================= */
(function () {
  "use strict";

  var EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  /* ==== 仮想ボディと字間 ==== */
  var BODY_W = 300, BODY_H = 630;   // SVG の仮想ボディ（フォント単位）
  var TRACK = 0.20;                 // 字間 = 仮想ボディ幅の20%
  var ADVANCE = BODY_W * (1 + TRACK);   // 送り幅 360u

  /* ==== R面（英語）調整パラメータ ==== */
  var R_BODY_RATIO = 0.585;   // 仮想ボディの高さ / 画面高
  var R_FG = "#ffffff", R_BG = "#000000";

  /* ==== L面（カレンダー）調整パラメータ ==== */
  var C_COLS = 7, C_ROWS = 5;
  var C_UNIT_RATIO = 1 / 18;  // 罫の太さ（＝外周マージン）/ 画面高
  var C_DOT_RATIO = 0.5;      // ドットの半径 / 罫の太さ
  var C_FG = "#000000", C_BG = "#ffffff";

  /* ==== 共通 ==== */
  var PINK = "#ff3c8c";
  var BLINK_MS = 1000;        // 点滅の周期（この間隔で L→R→L… と入れ替わる）

  /* ==== グリフデータ（SD_font_EN.svg のパスをフォント座標のまま保持）====
   * bx,by : そのグリフの仮想ボディ左上（フォント座標）
   * d / circles : 形状（フォント座標）
   * 描画時に (bx,by) を原点へ移すので、仮想ボディ左上を指定すれば置ける。 */
  var GLYPHS = {
    "S": {"bx":1263.87,"by":2112.5,"d":"M1413.87,2157.5c49.63,0,90,40.37,90,90h60c0-82.71-67.29-150-150-150s-150,67.29-150,150v60c0,82.71,67.29,150,150,150h0s0,0,0,0c49.63,0,90,40.37,90,90v60c0,49.63-40.37,90-90,90s-90-40.37-90-90h-60c0,82.71,67.29,150,150,150s150-67.29,150-150v-60c0-82.71-67.29-150-150-150h0s0,0,0,0c-49.63,0-90-40.37-90-90v-60c0-49.63,40.37-90,90-90Z"},
    "U": {"bx":781.93,"by":307.5,"d":"M1021.94,795c0,49.63-40.37,90-90,90s-90-40.37-90-90v-487.5h-60v487.5c0,82.71,67.29,150,150,150s150-67.29,150-150v-487.5h-60v487.5Z"},
    "N": {"bx":300,"by":1232.5,"d":"M539,1292.5 L540,1292.5 L540,1685.19 L350.98,1232.5 L300,1232.5 L300,1862.5 L360,1862.5 L360,1409.81 L549.02,1862.5 L600,1862.5 L600,1232.5 L539,1232.5 L539,1292.5 Z"},
    "M": {"bx":1745.8,"by":307.5,"d":"M1895.8,546.49 L1796.85,307.5 L1745.8,307.5 L1745.8,937.5 L1805.8,937.5 L1805.8,485.97 L1874.76,652.5 L1916.85,652.5 L1985.8,485.97 L1985.8,937.5 L2045.8,937.5 L2045.8,307.5 L1994.76,307.5 L1895.8,546.49 Z"},
    "O": {"bx":2227.74,"by":300,"d":"M2377.74,285c-82.71,0-150,67.29-150,150v360c0,82.71,67.29,150,150,150s150-67.29,150-150v-360c0-82.71-67.29-150-150-150ZM2467.74,795c0,49.63-40.37,90-90,90h0c-49.63,0-90-40.37-90-90v-360c0-49.63,40.37-90,90-90s90,40.37,90,90v360Z"},
    "T": {"bx":300,"by":307.5,"d":"M420,307.5 L300,307.5 L300,367.5 L420,367.5 L420,937.5 L480,937.5 L480,367.5 L600,367.5 L600,307.5 L480,307.5 L420,307.5 Z"},
    "E": {"bx":1263.87,"by":307.5,"d":"M1263.87,307.5 L1263.87,367.5 L1263.87,562.5 L1263.87,622.5 L1263.87,937.5 L1563.87,937.5 L1563.87,877.5 L1323.87,877.5 L1323.87,622.5 L1503.87,622.5 L1503.87,562.5 L1323.87,562.5 L1323.87,367.5 L1563.87,367.5 L1563.87,307.5 L1323.87,307.5 L1263.87,307.5 Z"},
    "W": {"bx":781.43,"by":1232.5,"d":"M1021.44,1684.04 L952.48,1517.5 L910.39,1517.5 L841.44,1684.04 L841.44,1232.5 L781.44,1232.5 L781.44,1862.5 L832.48,1862.5 L931.44,1623.51 L1030.39,1862.5 L1081.44,1862.5 L1081.44,1232.5 L1021.44,1232.5 L1021.44,1684.04 Z"},
    "D": {"bx":1263.87,"by":1232.5,"d":"M1413.87,1232.5h-150v630h150c82.71,0,150-67.29,150-150v-330c0-82.71-67.29-150-150-150ZM1503.87,1712.5c0,49.63-40.37,90-90,90h-90v-510h90c49.63,0,90,40.37,90,90v330Z"},
    "H": {"bx":1745.8,"by":1232.5,"d":"M1984.8,1292.5 L1985.8,1292.5 L1985.8,1487.5 L1805.8,1487.5 L1805.8,1232.5 L1745.8,1232.5 L1745.8,1487.5 L1745.8,1547.5 L1745.8,1862.5 L1805.8,1862.5 L1805.8,1547.5 L1985.8,1547.5 L1985.8,1862.5 L2045.8,1862.5 L2045.8,1232.5 L1984.8,1232.5 L1984.8,1292.5 Z"},
    "F": {"bx":2227.74,"by":1232.5,"d":"M2227.74,1232.5 L2227.74,1292.5 L2227.74,1487.5 L2227.74,1547.5 L2227.74,1862.5 L2287.74,1862.5 L2287.74,1547.5 L2467.74,1547.5 L2467.74,1487.5 L2287.74,1487.5 L2287.74,1292.5 L2527.74,1292.5 L2527.74,1232.5 L2287.74,1232.5 L2227.74,1232.5 Z"},
    "R": {"bx":300,"by":2112.5,"d":"M450,2112.5h-150v630h0s60,0,60,0h0v-255h80.64l95.32,255h64.04v-.04l-98.68-264.01c57.51-21,98.68-76.26,98.68-140.96v-75c0-82.71-67.29-150-150-150ZM540,2337.5c0,49.63-40.37,90-90,90h-90v-255h90c49.63,0,90,40.37,90,90v75Z"},
    "I": {"bx":781.43,"by":2112.5,"d":"M901.44,2112.5 L781.44,2112.5 L781.44,2172.5 L901.44,2172.5 L901.44,2682.5 L781.44,2682.5 L781.44,2742.5 L901.44,2742.5 L961.44,2742.5 L1081.44,2742.5 L1081.44,2682.5 L961.44,2682.5 L961.44,2172.5 L1081.44,2172.5 L1081.44,2112.5 L961.44,2112.5 L901.44,2112.5 Z"},
    "A": {"bx":1745.8,"by":2112.5,"d":"M1898.92,2112.5h-60.64l-92.46,630h60.64l25.01-170.4h128.69l25.01,170.4h60.64l-92.46-630h-54.42ZM1840.27,2512.1l49.84-339.6h11.39l49.84,339.6h-111.07Z"},
    ".": {"bx":2227.74,"by":2112.5,"circles":[[2257.74,2720,30]]}
  };

  /* グリフごとの縦の伸縮率（仮想ボディ上端を固定したまま縦だけ伸ばす）。
   * U は下の丸みのオーバーシュートが 7.5u しかなく、同じ丸い字面の S・O（15u）より
   * 上がって見えるため、下端を 7.5u ぶん伸ばして揃える（637.5u → 645u）。
   * 上端は平らでキャップラインに乗っているので動かさない。
   * SVG 側の U を描き直したら、この表から外すこと。 */
  var Y_FIX = { "U": 645 / 637.5 };

  var pathCache = {};
  function getPath(ch) {
    if (!pathCache[ch]) pathCache[ch] = new Path2D(GLYPHS[ch].d);
    return pathCache[ch];
  }

  /* 仮想ボディの左上を (x,y)[px]、倍率 s で1文字描く */
  function drawGlyph(ctx, ch, x, y, s) {
    var g = GLYPHS[ch];
    if (!g) return;
    var fy = Y_FIX[ch] || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s * fy);             // 縦補正（仮想ボディ上端を固定）
    ctx.translate(-g.bx, -g.by);      // フォント座標 → 仮想ボディ原点
    if (g.d) ctx.fill(getPath(ch));
    if (g.circles) {
      for (var i = 0; i < g.circles.length; i++) {
        var c = g.circles[i];
        ctx.beginPath();
        ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* 点滅の位相。L は偶数秒、R は奇数秒に点く（＝左右で交互） */
  function dotOn(side, now) {
    var phase = Math.floor(now / BLINK_MS) % 2;
    return side === "R" ? phase === 1 : phase === 0;
  }

  /* その月の第何週か（0始まり。列は曜日、行はこの値） */
  function weekIndex(d) {
    var first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    var wi = Math.floor((first + d.getDate() - 1) / 7);
    return Math.max(0, Math.min(C_ROWS - 1, wi));
  }

  /* ==== L面：カレンダー ====
   * 外周マージン・罫の太さともに u（= 画面高/18）。
   * 縦罫 C_COLS+1 本・横罫 C_ROWS+1 本で 7×5 のマスを作る。 */
  function layoutL(w, h, now) {
    var u = h * C_UNIT_RATIO;
    var gw = w - u * 2, gh = h - u * 2;
    var cellW = (gw - (C_COLS + 1) * u) / C_COLS;
    var cellH = (gh - (C_ROWS + 1) * u) / C_ROWS;
    var d = new Date(now);
    var col = d.getDay(), row = weekIndex(d);
    return {
      u: u, x: u, y: u, gw: gw, gh: gh, cellW: cellW, cellH: cellH,
      col: col, row: row,
      dotX: u + u + col * (cellW + u) + cellW / 2,
      dotY: u + u + row * (cellH + u) + cellH / 2,
      dotR: u * C_DOT_RATIO
    };
  }

  function drawL(ctx, w, h, now) {
    var lo = layoutL(w, h, now);
    ctx.save();
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = C_FG;
    for (var i = 0; i <= C_COLS; i++) {
      ctx.fillRect(lo.x + i * (lo.cellW + lo.u), lo.y, lo.u, lo.gh);
    }
    for (var j = 0; j <= C_ROWS; j++) {
      ctx.fillRect(lo.x, lo.y + j * (lo.cellH + lo.u), lo.gw, lo.u);
    }

    if (dotOn("L", now)) {
      ctx.fillStyle = PINK;
      ctx.beginPath();
      ctx.arc(lo.dotX, lo.dotY, lo.dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ==== R面：英語3文字＋ピリオド ====
   * 3文字を画面中央に置き、ピリオドは次の仮想ボディに入れる（右へはみ出す）。
   * 返り値: { s, y, x[], dotX } x[] は各文字の仮想ボディ左上 */
  function layoutR(text, w, h) {
    var s = (h * R_BODY_RATIO) / BODY_H;
    var adv = ADVANCE * s;
    var lettersW = BODY_W * s + adv * (text.length - 1);
    var x0 = (w - lettersW) / 2;
    var xs = [];
    for (var i = 0; i < text.length; i++) xs.push(x0 + adv * i);
    return { s: s, y: (h - BODY_H * s) / 2, x: xs, dotX: x0 + adv * text.length };
  }

  function drawR(ctx, w, h, now) {
    var text = EN[new Date(now).getDay()];
    var lo = layoutR(text, w, h);
    ctx.save();
    ctx.fillStyle = R_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = R_FG;
    for (var i = 0; i < text.length; i++) {
      drawGlyph(ctx, text.charAt(i), lo.x[i], lo.y, lo.s);
    }
    if (dotOn("R", now)) {
      ctx.fillStyle = PINK;
      drawGlyph(ctx, ".", lo.dotX, lo.y, lo.s);
    }
    ctx.restore();
  }

  /* ==== 入口: side で L=カレンダー / R=英語 を切り替え ==== */
  function draw(ctx, w, h, side, now) {
    if (now === undefined) now = Date.now();
    if (side === "R") { drawR(ctx, w, h, now); return; }
    drawL(ctx, w, h, now);
  }

  var clip = {
    id: "G_02",
    name: "weekday",
    draw: draw,
    /* 検証・外部利用向け */
    EN: EN,
    layoutL: layoutL,
    layoutR: layoutR,
    dotOn: dotOn,
    weekIndex: weekIndex,
    GLYPHS: GLYPHS,
    params: {
      BODY_W: BODY_W, BODY_H: BODY_H, TRACK: TRACK, ADVANCE: ADVANCE,
      R_BODY_RATIO: R_BODY_RATIO, R_FG: R_FG, R_BG: R_BG,
      C_COLS: C_COLS, C_ROWS: C_ROWS, C_UNIT_RATIO: C_UNIT_RATIO,
      C_DOT_RATIO: C_DOT_RATIO, C_FG: C_FG, C_BG: C_BG,
      PINK: PINK, BLINK_MS: BLINK_MS, Y_FIX: Y_FIX
    }
  };

  if (typeof window !== "undefined") {
    window.GEN_CLIPS = window.GEN_CLIPS || {};
    window.GEN_CLIPS[clip.id] = clip;
    if (typeof window.registerGenClip === "function") window.registerGenClip(clip);
  }
  if (typeof module !== "undefined" && module.exports) module.exports = clip;
})();

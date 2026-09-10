/* same difference — 音声ファイル一覧
 * assets/audio/ フォルダ内のファイル名を「サンプルの長さ（秒）」ごとに列挙する。
 * index.html が WebAudio で全ファイルを事前デコードし、切替グリッド
 * （15秒 / 30秒）の境界ちょうどに次のサンプルを予約再生する。
 * サンプルがグリッドより短ければループで埋め、長ければ境界でカットする。
 *
 * ここのキー（30 など）が control 画面の「使うサンプル」チェックになる。
 * 列挙したファイルはチェックの状態に関わらずページを開いた時点で
 * 全て取得・デコードされるため、使わない長さはキーごと外しておく。
 * 2026年9月：本番は30秒版のみを使用。6秒・15秒は下にコメントで残してある。 */
window.AUDIO_FILES = {
  30: [
    'fabcafe - 30sec_1.wav',
    'fabcafe - 30sec_2.wav',
    'fabcafe - 30sec_3.wav',
    'fabcafe - 30sec_4.wav',
    'fabcafe - 30sec_5.wav',
    'fabcafe - 30sec_6.wav',
    'fabcafe - 30sec_7.wav',
    'fabcafe - 30sec_8.wav',
    'fabcafe - 30sec_9.wav',
    'fabcafe - 30sec_10.wav',
  ],

  /* 使う場合はコメントを外す
  6: [
    'fabcafe - 6sec_1.wav',
    'fabcafe - 6sec_2.wav',
    'fabcafe - 6sec_3.wav',
    'fabcafe - 6sec_4.wav',
  ],
  15: [
    'fabcafe - 15sec_1.wav',
    'fabcafe - 15sec_2.wav',
    'fabcafe - 15sec_3.wav',
  ],
  */
};

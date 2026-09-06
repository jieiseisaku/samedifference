/* same difference — 音声ファイル一覧
 * assets/audio/ フォルダ内のファイル名を「サンプルの長さ（秒）」ごとに列挙する。
 * index.html が WebAudio で全ファイルを事前デコードし、切替グリッド
 * （15秒 / 30秒）の境界ちょうどに次のサンプルを予約再生する。
 * サンプルがグリッドより短ければループで埋め、長ければ境界でカットする。
 *
 * ここのキー（6 / 15 / 30）が control 画面の「使うサンプル」チェックになる。
 * 長さを増やしたい場合はキーごと追加すればチェックも自動で増える。 */
window.AUDIO_FILES = {
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
  30: [
    'fabcafe - 30sec_1.wav',
    'fabcafe - 30sec_2.wav',
    'fabcafe - 30sec_3.wav',
  ],
};

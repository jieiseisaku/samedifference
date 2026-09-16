#!/usr/bin/env python3
"""same difference — ローカル配信用の簡易サーバー

このファイルのあるフォルダを http://localhost:8000/ で配信する。
GitHub Pages を経由せず、手元のファイルをそのまま読ませるための道具。

    python3 serve.py          （Mac）
    py serve.py               （Windows）

Mac は run_local.command、Windows は run_local.bat をダブルクリックしても同じ。
止めるときはウィンドウで control + C。
"""
import http.server
import os
import socketserver
import webbrowser

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'      # 接続を使い回して大きい動画の取得を速くする

    def log_message(self, *args):      # 1本ごとのログは出さない（動作を軽くする）
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        url = 'http://localhost:%d/index.html' % PORT
        print('配信中: %s' % url)
        print('止めるには control + C')
        try:
            webbrowser.open(url)
        except Exception:
            pass
        httpd.serve_forever()

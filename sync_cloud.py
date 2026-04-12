#!/usr/bin/env python3
"""Google スプレッドシートから動画データを取得してvideos.jsonを生成"""

import json
import re
import urllib.request
import urllib.parse

SHEET_ID = '1QF2Cmuds6ao6Y-JTEIdTJIZBWhvRo3Sa_TJ_Amu7GTs'
OUTPUT = 'assets/videos.json'
SHEET_NAMES = [
    '1月メニュー', '2月メニュー', '3月メニュー', '4月メニュー',
    '5月メニュー', '6月メニュー', '7月メニュー', '8月メニュー',
    '9月メニュー', '10月メニュー', '11月メニュー', '12月メニュー',
]


def extract_video_id(url):
    if not url:
        return None
    m = re.search(
        r'(?:youtu\.be/|youtube\.com/watch\?v=|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        url,
    )
    return m.group(1) if m else None


def fetch_sheet(sheet_name):
    """gviz API でシートデータを取得"""
    encoded = urllib.parse.quote(sheet_name)
    url = (
        f'https://docs.google.com/spreadsheets/d/{SHEET_ID}'
        f'/gviz/tq?tqx=out:json&sheet={encoded}'
    )
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        raw = res.read().decode('utf-8')
    json_str = raw.split('(', 1)[1].rsplit(')', 1)[0]
    data = json.loads(json_str)
    rows = []
    for row in data['table']['rows']:
        cells = row.get('c', [])
        vals = []
        for c in cells:
            if c is None:
                vals.append(None)
            else:
                vals.append(c.get('v'))
        rows.append(vals)
    return rows


def add_video(videos, url, category, sub_category='', date='', duration=None):
    if not url or not isinstance(url, str):
        return
    vid = extract_video_id(url)
    if not vid:
        return
    if vid not in videos:
        videos[vid] = {
            'videoId': vid,
            'url': f'https://youtu.be/{vid}',
            'categories': [],
            'dates': [],
            'duration': duration,
        }
    cat_entry = {'category': category, 'subCategory': sub_category}
    if cat_entry not in videos[vid]['categories']:
        videos[vid]['categories'].append(cat_entry)
    if date and date not in videos[vid]['dates']:
        videos[vid]['dates'].append(str(date))
    if duration and isinstance(duration, (int, float)):
        videos[vid]['duration'] = duration


def main():
    videos = {}

    for sheet_name in SHEET_NAMES:
        print(f'読み込み中: {sheet_name}')
        try:
            rows = fetch_sheet(sheet_name)
        except Exception as e:
            print(f'  スキップ ({e})')
            continue

        # ヘッダー行をスキップ（1行目）
        for row in rows[1:]:
            if len(row) < 6:
                continue
            date_val = row[0]
            if date_val is None:
                continue
            date_str = str(int(date_val)) if isinstance(date_val, (int, float)) else str(date_val)
            bui = str(row[1]) if len(row) > 1 and row[1] else ''

            # 列マッピング: D(3)ラジオ体操, E(4)時間, F(5)筋トレ, G(6)時間,
            # H(7)有酸素①, I(8)時間, J(9)有酸素②, K(10)時間,
            # L(11)ストレッチ, M(12)時間, N(13)ストレッチ
            col_map = [
                (3, 4, 'ラジオ体操', ''),
                (5, 6, '筋トレ', bui),
                (7, 8, '有酸素', ''),
                (9, 10, '有酸素', ''),
                (11, 12, 'ストレッチ', ''),
                (13, None, 'ストレッチ', ''),
            ]
            for col_idx, dur_idx, cat, sub in col_map:
                if col_idx < len(row):
                    url = row[col_idx]
                    dur = row[dur_idx] if dur_idx and dur_idx < len(row) else None
                    if url and isinstance(url, str) and 'youtu' in url:
                        add_video(videos, url, cat, sub, date_str, dur)

    video_list = list(videos.values())
    print(f'\n合計動画数: {len(video_list)}')

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(video_list, f, ensure_ascii=False, indent=2)
    print(f'保存完了: {OUTPUT}')


if __name__ == '__main__':
    main()

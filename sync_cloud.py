#!/usr/bin/env python3
"""Google スプレッドシートから動画データを取得してvideos.jsonを生成
YouTube動画タイトルを取得し、内容に基づいてカテゴリを自動分類"""

import json
import os
import re
import time
import urllib.request
import urllib.parse

SHEET_ID = '1QF2Cmuds6ao6Y-JTEIdTJIZBWhvRo3Sa_TJ_Amu7GTs'
OUTPUT = 'assets/videos.json'
SHEET_NAMES = [
    '1月メニュー', '2月メニュー', '3月メニュー', '4月メニュー',
    '5月メニュー', '6月メニュー', '7月メニュー', '8月メニュー',
    '9月メニュー', '10月メニュー', '11月メニュー', '12月メニュー',
]

# タイトルからカテゴリを自動判定するルール（優先度順）
AUTO_CATEGORY_RULES = [
    ('ボクササイズ', ['ボクササイズ', 'ボクシング', 'キックボクシング', 'パンチ', 'ボクシングエクササイズ']),
    ('ヨガ', ['ヨガ', 'yoga', 'パワーヨガ', 'ヨガフロー', 'ヴィンヤサ']),
    ('ピラティス', ['ピラティス', 'pilates']),
    ('ダンス', ['ダンス', 'dance', 'エアロビクス', 'エアロビ', 'ズンバ', 'zumba']),
    ('HIIT', ['hiit', 'タバタ', 'tabata', 'インターバル']),
    ('ラジオ体操', ['ラジオ体操']),
    ('有酸素', ['有酸素', 'カーディオ', 'cardio', 'ウォーキング', 'ジョギング', 'マラソン', '脂肪燃焼', 'エアロ']),
    ('ストレッチ', ['ストレッチ', 'stretch', '柔軟', 'ほぐし', 'リラックス', 'クールダウン', 'リラクゼーション']),
    ('筋トレ', ['筋トレ', '筋肉', 'トレーニング', 'ワークアウト', 'workout', '腹筋', '背筋', '腕立て',
               'スクワット', 'プランク', 'デッドリフト', 'ベンチプレス', '体幹', 'ダンベル']),
]

# 部位をタイトルから検出
BUI_KEYWORDS = {
    '足': ['足', '脚', 'レッグ', 'ふくらはぎ', '太もも', 'スクワット', 'ランジ'],
    '腹筋': ['腹筋', 'お腹', '腹', 'abs', 'プランク'],
    '背中': ['背中', '背筋', 'バック', '僧帽筋', '広背筋'],
    '胸': ['胸', 'チェスト', '大胸筋', 'ベンチプレス', '胸筋'],
    '腕': ['腕', '二の腕', '上腕', 'アーム', '腕立て'],
    'お尻': ['お尻', 'ヒップ', '臀筋', 'ヒップアップ'],
    '体幹': ['体幹', 'コア', 'core', 'プランク'],
    '肩': ['肩', 'ショルダー', '三角筋'],
    '全身': ['全身', 'フルボディ', 'full body'],
    '上半身': ['上半身', 'アッパー'],
    '下半身': ['下半身', 'ロウワー', '下半身痩せ'],
}


def extract_video_id(url):
    if not url:
        return None
    m = re.search(
        r'(?:youtu\.be/|youtube\.com/watch\?v=|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        url,
    )
    return m.group(1) if m else None


def fetch_video_title(video_id):
    """YouTube oEmbed APIで動画タイトルを取得"""
    url = f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get('title', '')
    except Exception:
        return ''


def auto_categorize(title):
    """タイトルからカテゴリと部位を自動判定"""
    if not title:
        return [], []

    title_lower = title.lower()
    categories = []
    for cat_name, keywords in AUTO_CATEGORY_RULES:
        for kw in keywords:
            if kw.lower() in title_lower:
                if cat_name not in categories:
                    categories.append(cat_name)
                break

    bui_parts = []
    for bui_name, keywords in BUI_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in title_lower:
                if bui_name not in bui_parts:
                    bui_parts.append(bui_name)
                break

    return categories, bui_parts


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

    # 既存データからタイトルキャッシュを読み込み
    title_cache = {}
    if os.path.exists(OUTPUT):
        with open(OUTPUT, 'r', encoding='utf-8') as f:
            old_data = json.loads(f.read())
            for v in old_data:
                if v.get('title'):
                    title_cache[v['videoId']] = v['title']

    # YouTube動画タイトルを取得（未取得のもののみ）
    new_count = 0
    for i, v in enumerate(video_list):
        vid = v['videoId']
        if vid in title_cache:
            v['title'] = title_cache[vid]
        else:
            print(f'  タイトル取得中 ({i+1}/{len(video_list)}): {vid}')
            v['title'] = fetch_video_title(vid)
            if v['title']:
                new_count += 1
            time.sleep(0.3)  # レート制限対策

    print(f'新規タイトル取得: {new_count}件')

    # タイトルからカテゴリと部位を自動判定
    for v in video_list:
        title = v.get('title', '')
        auto_cats, auto_bui = auto_categorize(title)

        # 自動カテゴリをマージ（スプレッドシートのカテゴリに追加）
        for cat in auto_cats:
            cat_entry = {'category': cat, 'subCategory': ''}
            if cat_entry not in v['categories']:
                v['categories'].append(cat_entry)

        # 自動検出した部位を保存
        if auto_bui:
            v['autoBui'] = auto_bui

    # カテゴリ集計
    cat_count = {}
    for v in video_list:
        for c in v['categories']:
            cat = c['category']
            cat_count[cat] = cat_count.get(cat, 0) + 1
    print(f'カテゴリ別: {json.dumps(cat_count, ensure_ascii=False)}')

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(video_list, f, ensure_ascii=False, indent=2)
    print(f'保存完了: {OUTPUT}')


if __name__ == '__main__':
    main()

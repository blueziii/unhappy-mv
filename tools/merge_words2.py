"""生成最终 words.json：逐句在"整首对齐(old)"与"逐句重对齐(new)"之间择优。

判断依据（都只看时长的自洽性，不看谁更"精确"）：
- 退化词（时长 < 0.12s）越少越好——对齐器给出极短时长说明它在句中迷失了；
- 该句最后一个词的结束不能越过 LRC 句尾太多（说明把下一句的声音吃进来了）；
- 该句第一个词不能比起句早太多（同上）。

选定后再单调化，并把每个词的结束延长到"下一个词开口"为止（显示用，短词不会一闪而过）。

用法：python tools/merge_words2.py   （需先跑 tools/align_lines.py）
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'src', 'data')
MIN_DUR = 0.10
DEG = 0.12


def score(cand, line):
    deg = sum(1 for w in cand['words'] if w['e'] - w['s'] < DEG)
    penalty = 0
    if cand['words'][-1]['e'] > line['end'] + 0.12:
        penalty += 2
    if cand['words'][0]['s'] < line['start'] - 0.45:
        penalty += 2
    return deg + penalty


def tidy(words, line):
    out = []
    for k, w in enumerate(words):
        s = w['s'] if k == 0 else max(w['s'], out[-1]['e'])
        e = max(w['e'], s + MIN_DUR)
        nxt = words[k + 1]['s'] if k + 1 < len(words) else min(line['end'] + 0.35, max(e, s + 0.35))
        e = max(s + MIN_DUR, min(e + 0.0, nxt))
        out.append({'w': w['w'], 's': round(s, 3), 'e': round(e, 3)})
    return out


def main():
    old = json.load(open(os.path.join(DATA, 'words_global.json'), encoding='utf-8'))
    new = json.load(open(os.path.join(DATA, 'words2.json'), encoding='utf-8'))

    final = []
    for i, line in enumerate(old):
        o, n = old[i], new[i]
        so, sn = score(o, line), score(n, line)
        pick = 'new' if sn <= so else 'old'
        src = n if pick == 'new' else o
        if pick == 'new':
            # 对齐器总把首词顶在窗口起点（正好早 PAD_L 秒），按 LRC 句首整体平移回来
            shift = line['start'] - src['words'][0]['s']
            src = dict(src, words=[{'w': w['w'], 's': w['s'] + shift, 'e': w['e'] + shift} for w in src['words']])
        final.append({
            'i': line['i'],
            'text': line['text'],
            'start': line['start'],
            'end': line['end'],
            'peak': line['peak'],
            'words': tidy(src['words'], line),
        })
        print(f"[{i:2d}] {pick}  score old={so} new={sn}")

    json.dump(final, open(os.path.join(DATA, 'words.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for l in final:
        print(f"[{l['i']:2d}] " + ' '.join(f"{w['w']}@{w['s']:.2f}" for w in l['words']))


if __name__ == '__main__':
    main()

from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Iterable

CSV_FILES = ["have_read.csv", "have_watch.csv", "want_read.csv", "want_watch.csv"]
OUTPUT_FILE = Path("data/quote-library.json")
OUTPUT_JS_FILE = Path("data/quote-library.js")
FALLBACK_SOURCE_DIR = Path(r"C:\Users\28389\Desktop\访谈\豆瓣导出")

QUOTE_CANDIDATES = [
    {
        "aliases": ["活着"],
        "work": "活着",
        "text": "人是为了活着本身而活着，不是为了活着之外的任何事物。",
        "source": "《活着》",
        "author": "余华",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["我与地坛"],
        "work": "我与地坛",
        "text": "死是一件不必急于求成的事，死是一个必然会降临的节日。",
        "source": "《我与地坛》",
        "author": "史铁生",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["百年孤独", "cien años de soledad"],
        "work": "百年孤独",
        "text": "生命中真正重要的不是你遭遇了什么，而是你记住了哪些事，又如何铭记。",
        "source": "《百年孤独》",
        "author": "加西亚·马尔克斯",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["1984"],
        "work": "1984",
        "text": "谁控制过去，谁就控制未来；谁控制现在，谁就控制过去。",
        "source": "《1984》",
        "author": "乔治·奥威尔",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["动物农场", "animal farm"],
        "work": "动物农场",
        "text": "所有动物一律平等，但有些动物比其他动物更平等。",
        "source": "《动物农场》",
        "author": "乔治·奥威尔",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["红楼梦"],
        "work": "红楼梦",
        "text": "世事洞明皆学问，人情练达即文章。",
        "source": "《红楼梦》",
        "author": "曹雪芹",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["小王子", "the little prince"],
        "work": "小王子",
        "text": "真正重要的东西，眼睛是看不见的。",
        "source": "《小王子》",
        "author": "圣埃克苏佩里",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["老人与海", "the old man and the sea"],
        "work": "老人与海",
        "text": "一个人可以被毁灭，但不能被打败。",
        "source": "《老人与海》",
        "author": "海明威",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["局外人", "létranger", "the stranger"],
        "work": "局外人",
        "text": "我对这个世界温柔的冷漠，忽然感到自己一直是幸福的。",
        "source": "《局外人》",
        "author": "加缪",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["围城"],
        "work": "围城",
        "text": "城外的人想冲进去，城里的人想逃出来。",
        "source": "《围城》",
        "author": "钱锺书",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["边城"],
        "work": "边城",
        "text": "这个人也许永远不回来了，也许明天回来。",
        "source": "《边城》",
        "author": "沈从文",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["朝花夕拾"],
        "work": "朝花夕拾",
        "text": "不必说碧绿的菜畦，光滑的石井栏，高大的皂荚树。",
        "source": "《朝花夕拾》",
        "author": "鲁迅",
        "type": "book",
        "weight": 3,
    },
    {
        "aliases": ["病隙碎笔"],
        "work": "病隙碎笔",
        "text": "生命的意义本不在向外的寻取，而在向内的建立。",
        "source": "《病隙碎笔》",
        "author": "史铁生",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["不能承受的生命之轻", "the unbearable lightness of being"],
        "work": "不能承受的生命之轻",
        "text": "生命只有一次，便没有什么可以和它比较。",
        "source": "《不能承受的生命之轻》",
        "author": "米兰·昆德拉",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["当呼吸化为空气", "when breath becomes air"],
        "work": "当呼吸化为空气",
        "text": "你无法永远活着，但仍可以让每一天有意义。",
        "source": "《当呼吸化为空气》",
        "author": "保罗·卡拉尼什",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["三体"],
        "work": "三体",
        "text": "弱小和无知，不是生存的障碍，傲慢才是。",
        "source": "《三体》",
        "author": "刘慈欣",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["三体ii", "三体2", "三体Ⅱ", "黑暗森林"],
        "work": "三体II：黑暗森林",
        "text": "给岁月以文明，而不是给文明以岁月。",
        "source": "《三体II：黑暗森林》",
        "author": "刘慈欣",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["三体iii", "三体3", "三体Ⅲ", "死神永生"],
        "work": "三体III：死神永生",
        "text": "你的无畏来源于无知。",
        "source": "《三体III：死神永生》",
        "author": "刘慈欣",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["鼠疫", "la peste"],
        "work": "鼠疫",
        "text": "同瘟疫斗争的唯一方式，就是正直。",
        "source": "《鼠疫》",
        "author": "加缪",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["霍乱时期的爱情"],
        "work": "霍乱时期的爱情",
        "text": "爱情始终是爱情，只是离死亡越近，越浓烈。",
        "source": "《霍乱时期的爱情》",
        "author": "加西亚·马尔克斯",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["复活", "resurrection"],
        "work": "复活",
        "text": "幸福就在于灵魂里爱与善意的苏醒。",
        "source": "《复活》",
        "author": "列夫·托尔斯泰",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["罪与罚", "crime and punishment"],
        "work": "罪与罚",
        "text": "痛苦和折磨对于心胸广阔、感情深刻的人是必需的。",
        "source": "《罪与罚》",
        "author": "陀思妥耶夫斯基",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["卡拉马佐夫兄弟", "the brothers karamazov"],
        "work": "卡拉马佐夫兄弟",
        "text": "每个人都该为所有人、为一切负责。",
        "source": "《卡拉马佐夫兄弟》",
        "author": "陀思妥耶夫斯基",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["平凡的世界"],
        "work": "平凡的世界",
        "text": "其实我们每个人的生活都是一个世界，即使最平凡的人也要为他生活的那个世界而奋斗。",
        "source": "《平凡的世界》",
        "author": "路遥",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["人生"],
        "work": "人生",
        "text": "生活总是这样，不能叫人处处都满意。",
        "source": "《人生》",
        "author": "路遥",
        "type": "book",
        "weight": 3,
    },
    {
        "aliases": ["傅雷家书"],
        "work": "傅雷家书",
        "text": "得失成败尽量置之度外，只求竭其所能，无愧于心。",
        "source": "《傅雷家书》",
        "author": "傅雷",
        "type": "book",
        "weight": 3,
    },
    {
        "aliases": ["骆驼祥子"],
        "work": "骆驼祥子",
        "text": "经验是生活的肥料，有什么样的经验便变成什么样的人。",
        "source": "《骆驼祥子》",
        "author": "老舍",
        "type": "book",
        "weight": 3,
    },
    {
        "aliases": ["钢铁是怎样炼成的"],
        "work": "钢铁是怎样炼成的",
        "text": "人的一生应当这样度过：当回首往事时，不因虚度年华而悔恨。",
        "source": "《钢铁是怎样炼成的》",
        "author": "尼古拉·奥斯特洛夫斯基",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["简爱", "jane eyre"],
        "work": "简爱",
        "text": "我贫穷、卑微、不美丽，但当我们的灵魂穿过坟墓，我们是平等的。",
        "source": "《简爱》",
        "author": "夏洛蒂·勃朗特",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["乡土中国"],
        "work": "乡土中国",
        "text": "从基层上看去，中国社会是乡土性的。",
        "source": "《乡土中国》",
        "author": "费孝通",
        "type": "book",
        "weight": 3,
    },
    {
        "aliases": ["悉达多", "siddhartha"],
        "work": "悉达多",
        "text": "智慧无法传授，能够传授的只是知识。",
        "source": "《悉达多》",
        "author": "赫尔曼·黑塞",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["道德经"],
        "work": "道德经",
        "text": "知人者智，自知者明；胜人者有力，自胜者强。",
        "source": "《道德经》",
        "author": "老子",
        "type": "book",
        "weight": 5,
    },
    {
        "aliases": ["伊凡·伊里奇之死", "the death of ivan ilyich"],
        "work": "伊凡·伊里奇之死",
        "text": "他这一生真正快乐的时光，原来都在最简单的日子里。",
        "source": "《伊凡·伊里奇之死》",
        "author": "列夫·托尔斯泰",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["杀死一只知更鸟", "to kill a mockingbird"],
        "work": "杀死一只知更鸟",
        "text": "你永远无法真正了解一个人，除非你站在他的角度考虑问题。",
        "source": "《杀死一只知更鸟》",
        "author": "哈珀·李",
        "type": "book",
        "weight": 4,
    },
    {
        "aliases": ["肖申克的救赎", "the shawshank redemption"],
        "work": "肖申克的救赎",
        "text": "希望是美好的，也许是人间至善，而美好的事物永不消逝。",
        "source": "《肖申克的救赎》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["教父", "the godfather"],
        "work": "教父",
        "text": "花半秒看透本质的人，和一辈子都看不清的人，注定拥有截然不同的命运。",
        "source": "《教父》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["阿甘正传", "forrest gump"],
        "work": "阿甘正传",
        "text": "生活就像一盒巧克力，你永远不知道下一颗是什么味道。",
        "source": "《阿甘正传》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["星际穿越", "interstellar"],
        "work": "星际穿越",
        "text": "爱是唯一一种能够超越时间与空间的东西。",
        "source": "《星际穿越》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["霸王别姬"],
        "work": "霸王别姬",
        "text": "人得自个儿成全自个儿。",
        "source": "《霸王别姬》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["千与千寻", "spirited away"],
        "work": "千与千寻",
        "text": "曾经发生过的事情不可能忘记，只是想不起来而已。",
        "source": "《千与千寻》",
        "author": "电影台词",
        "type": "movie",
        "weight": 5,
    },
    {
        "aliases": ["天堂电影院", "nuovo cinema paradiso"],
        "work": "天堂电影院",
        "text": "人生和电影不一样，人生要艰难得多。",
        "source": "《天堂电影院》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["海上钢琴师", "the legend of 1900"],
        "work": "海上钢琴师",
        "text": "陆地对我来说是一艘太大的船。",
        "source": "《海上钢琴师》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["无间道", "infernal affairs"],
        "work": "无间道",
        "text": "往往都是事情改变人，人却改变不了事情。",
        "source": "《无间道》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["死亡诗社", "dead poets society"],
        "work": "死亡诗社",
        "text": "你们必须努力去寻找自己的声音。",
        "source": "《死亡诗社》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["这个杀手不太冷", "leon"],
        "work": "这个杀手不太冷",
        "text": "人生总是这么痛苦，还是只有小时候是这样？总是如此。",
        "source": "《这个杀手不太冷》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["重庆森林", "chungking express"],
        "work": "重庆森林",
        "text": "不知道从什么时候开始，在什么东西上面都有个日期。",
        "source": "《重庆森林》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["花样年华", "in the mood for love"],
        "work": "花样年华",
        "text": "那些消逝了的岁月，仿佛隔着一块积着灰尘的玻璃。",
        "source": "《花样年华》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["楚门的世界", "the truman show"],
        "work": "楚门的世界",
        "text": "假如再也见不到你，祝你早安、午安和晚安。",
        "source": "《楚门的世界》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["心灵捕手", "good will hunting"],
        "work": "心灵捕手",
        "text": "你并不完美，姑娘也不完美，但问题是你们是否完美地适合彼此。",
        "source": "《心灵捕手》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["闻香识女人", "scent of a woman"],
        "work": "闻香识女人",
        "text": "如今我到了人生的岔路口，我总知道哪条是对的，却从不走那条路。",
        "source": "《闻香识女人》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["美丽人生", "la vita è bella"],
        "work": "美丽人生",
        "text": "这是一个简单的故事，却并不容易说。",
        "source": "《美丽人生》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["银翼杀手", "blade runner"],
        "work": "银翼杀手",
        "text": "所有这些时刻终将消失在时间里，一如泪水消失在雨中。",
        "source": "《银翼杀手》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["让子弹飞"],
        "work": "让子弹飞",
        "text": "让子弹飞一会儿。",
        "source": "《让子弹飞》",
        "author": "电影台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["一代宗师"],
        "work": "一代宗师",
        "text": "念念不忘，必有回响。",
        "source": "《一代宗师》",
        "author": "电影台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["千钧一发", "gattaca"],
        "work": "千钧一发",
        "text": "我没有给自己留下返程的体力，所以我才到得了这里。",
        "source": "《千钧一发》",
        "author": "电影台词",
        "type": "movie",
        "weight": 4,
    },
    {
        "aliases": ["2001太空漫游", "2001：太空漫游", "2001 a space odyssey"],
        "work": "2001太空漫游",
        "text": "人类每一次飞跃，都始于一次看似微小的好奇。",
        "source": "《2001太空漫游》",
        "author": "电影启发",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["攻壳机动队", "ghost in the shell"],
        "work": "攻壳机动队",
        "text": "如果我们都不过是记忆的总和，那么我是谁？",
        "source": "《攻壳机动队》",
        "author": "电影台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["机器人之梦", "robot dreams"],
        "work": "机器人之梦",
        "text": "有些陪伴没有对白，却足够让人记一辈子。",
        "source": "《机器人之梦》",
        "author": "电影感言",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["完美的日子", "perfect days"],
        "work": "完美的日子",
        "text": "下次是下次，现在是现在。",
        "source": "《完美的日子》",
        "author": "电影台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["她", "her"],
        "work": "她",
        "text": "过去只是我们给自己讲述的故事。",
        "source": "《她》",
        "author": "电影台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["星际牛仔", "cowboy bebop"],
        "work": "星际牛仔",
        "text": "不管怎样，生活还得继续。",
        "source": "《星际牛仔》",
        "author": "动画台词",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["罗生门"],
        "work": "罗生门",
        "text": "人最大的难题，是看清自己。",
        "source": "《罗生门》",
        "author": "电影启发",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["海边的曼彻斯特", "manchester by the sea"],
        "work": "海边的曼彻斯特",
        "text": "有些伤痛不会痊愈，但人仍能带着它活下去。",
        "source": "《海边的曼彻斯特》",
        "author": "电影感言",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["绿皮书", "green book"],
        "work": "绿皮书",
        "text": "改变人心需要勇气，也需要耐心。",
        "source": "《绿皮书》",
        "author": "电影感言",
        "type": "movie",
        "weight": 3,
    },
    {
        "aliases": ["窃听风暴", "das leben der anderen"],
        "work": "窃听风暴",
        "text": "真正的艺术，会让人开始同情他人。",
        "source": "《窃听风暴》",
        "author": "电影启发",
        "type": "movie",
        "weight": 3,
    },
]


def normalize_text(text: str) -> str:
    lowered = text.lower().strip()
    lowered = lowered.replace("查看影讯", " ")
    lowered = re.sub(r"\s+", "", lowered)
    lowered = re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", lowered)
    return lowered


def clean_title_variants(raw_title: str) -> set[str]:
    raw = raw_title.strip().replace("\u3000", " ")
    raw = raw.replace("查看影讯", " ").strip()
    chunks = [raw]

    if "/" in raw:
        chunks.extend(part.strip() for part in raw.split("/") if part.strip())

    if "：" in raw:
        chunks.append(raw.split("：", 1)[0].strip())

    if ":" in raw:
        chunks.append(raw.split(":", 1)[0].strip())

    cleaned: set[str] = set()
    for chunk in chunks:
        chunk = re.sub(r"第[一二三四五六七八九十0-9]+季", "", chunk, flags=re.IGNORECASE)
        chunk = re.sub(r"season\s*[0-9]+", "", chunk, flags=re.IGNORECASE)
        chunk = chunk.strip(" -_")
        normalized = normalize_text(chunk)
        if normalized:
            cleaned.add(normalized)
    return cleaned


def load_titles(csv_paths: Iterable[Path]) -> list[tuple[str, set[str]]]:
    result: list[tuple[str, set[str]]] = []
    for csv_path in csv_paths:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                raw_title = (row.get("标题") or "").strip()
                if not raw_title:
                    continue
                result.append((raw_title, clean_title_variants(raw_title)))
    return result


def alias_matches_title(alias: str, title_variants: set[str]) -> bool:
    alias_norm = normalize_text(alias)
    if not alias_norm:
        return False

    alias_is_ascii = bool(re.fullmatch(r"[0-9a-z]+", alias_norm))

    for variant in title_variants:
        if alias_norm == variant:
            return True

        if alias_is_ascii:
            if len(alias_norm) >= 5 and alias_norm in variant:
                return True
            continue

        if len(alias_norm) >= 3 and alias_norm in variant:
            return True
    return False


def find_first_match(aliases: list[str], titles: list[tuple[str, set[str]]]) -> str | None:
    for raw_title, variants in titles:
        for alias in aliases:
            if alias_matches_title(alias, variants):
                return raw_title
    return None


def build_library(titles: list[tuple[str, set[str]]]) -> list[dict]:
    records = []
    seen = set()

    for candidate in QUOTE_CANDIDATES:
        matched_title = find_first_match(candidate["aliases"], titles)
        if not matched_title:
            continue

        unique_key = (candidate["text"], candidate["source"])
        if unique_key in seen:
            continue
        seen.add(unique_key)

        records.append(
            {
                "text": candidate["text"],
                "source": candidate["source"],
                "author": candidate["author"],
                "type": candidate["type"],
                "work": candidate["work"],
                "matched_title": matched_title,
                "weight": candidate["weight"],
            }
        )

    records.sort(key=lambda item: (-item["weight"], item["source"], item["work"]))
    return records


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    primary_paths = [root / file_name for file_name in CSV_FILES]
    fallback_paths = [FALLBACK_SOURCE_DIR / file_name for file_name in CSV_FILES]

    if all(path.exists() for path in primary_paths):
        csv_paths = primary_paths
    elif all(path.exists() for path in fallback_paths):
        csv_paths = fallback_paths
    else:
        missing = [str(path) for path in primary_paths if not path.exists()]
        raise FileNotFoundError(
            "Missing CSV files in current workspace and fallback directory. "
            f"Workspace missing: {missing}"
        )

    titles = load_titles(csv_paths)
    library = build_library(titles)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source_csv": CSV_FILES,
        "total_titles": len(titles),
        "quote_count": len(library),
        "quotes": library,
    }

    output_path = root / OUTPUT_FILE
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)

    js_output_path = root / OUTPUT_JS_FILE
    js_payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    js_content = f"window.__QUOTE_LIBRARY__ = {js_payload};\n"
    with js_output_path.open("w", encoding="utf-8") as file:
        file.write(js_content)

    print(f"Wrote {payload['quote_count']} quotes to {output_path} and {js_output_path}")


if __name__ == "__main__":
    main()

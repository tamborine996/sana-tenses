#!/usr/bin/env python3
"""Import the unabridged Project Gutenberg #43936 text and chapter art."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

SOURCE_URL = "https://www.gutenberg.org/cache/epub/43936/pg43936-images.html"
METADATA_URL = "https://www.gutenberg.org/ebooks/43936"
ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "book.json"
ASSETS_DIR = ROOT / "assets"

CHAPTER_TITLES = [
    "The Cyclone",
    "The Council with the Munchkins",
    "How Dorothy Saved the Scarecrow",
    "The Road Through the Forest",
    "The Rescue of the Tin Woodman",
    "The Cowardly Lion",
    "The Journey to the Great Oz",
    "The Deadly Poppy Field",
    "The Queen of the Field Mice",
    "The Guardian of the Gates",
    "The Wonderful Emerald City of Oz",
    "The Search for the Wicked Witch",
    "The Rescue",
    "The Winged Monkeys",
    "The Discovery of Oz, the Terrible",
    "The Magic Art of the Great Humbug",
    "How the Balloon Was Launched",
    "Away to the South",
    "Attacked by the Fighting Trees",
    "The Dainty China Country",
    "The Lion Becomes the King of Beasts",
    "The Country of the Quadlings",
    "Glinda the Good Witch Grants Dorothy’s Wish",
    "Home Again",
]

ROMAN = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
    "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII",
    "XXIII", "XXIV",
]


def download(session: requests.Session, url: str) -> bytes:
    response = session.get(url, timeout=90)
    response.raise_for_status()
    return response.content


def clean_paragraph(node: Tag) -> str:
    fragment = BeautifulSoup(str(node), "html.parser").find("p")
    assert fragment is not None
    for page_number in fragment.select(".pagenum"):
        page_number.decompose()
    return " ".join(fragment.get_text(" ", strip=True).split())


def main() -> None:
    session = requests.Session()
    session.headers["User-Agent"] = "SanaReadingImporter/1.0 (Project Gutenberg ingestion)"
    source = download(session, SOURCE_URL)
    source_hash = hashlib.sha256(source).hexdigest()
    soup = BeautifulSoup(source, "html.parser")
    main_text = soup.select_one("div.main")
    if main_text is None:
        raise RuntimeError("Project Gutenberg main text container was not found")

    chapters: list[dict[str, object]] = []
    current: dict[str, object] | None = None

    for node in main_text.descendants:
        if isinstance(node, Tag) and node.name == "a" and re.fullmatch(r"Chapter_[IVX]+", node.get("id", "")):
            chapter_id = node["id"].removeprefix("Chapter_")
            index = ROMAN.index(chapter_id)
            image = node.parent.find("img") if isinstance(node.parent, Tag) else None
            current = {
                "number": index + 1,
                "roman": chapter_id,
                "title": CHAPTER_TITLES[index],
                "paragraphs": [],
                "imageSource": urljoin(SOURCE_URL, image["src"]) if image and image.get("src") else None,
            }
            chapters.append(current)
            continue

        if current is None or not isinstance(node, Tag) or node.name != "p":
            continue
        if node.find_parent(attrs={"role": "figure"}) or "caption2" in (node.get("class") or []):
            continue
        text = clean_paragraph(node)
        if text:
            current["paragraphs"].append(text)

    if len(chapters) != 24:
        raise RuntimeError(f"Expected 24 chapters; found {len(chapters)}")

    for expected, chapter in enumerate(chapters, start=1):
        if chapter["number"] != expected or not chapter["paragraphs"]:
            raise RuntimeError(f"Chapter sequence/content validation failed at {expected}")
        chapter["wordCount"] = len(" ".join(chapter["paragraphs"]).split())

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    cover_node = main_text.select_one("img[alt='Wizard of Oz']")
    if cover_node is None:
        raise RuntimeError("Cover image was not found")
    cover_url = urljoin(SOURCE_URL, cover_node["src"])
    (ASSETS_DIR / "cover.jpg").write_bytes(download(session, cover_url))

    for chapter in chapters:
        image_url = chapter.pop("imageSource")
        if not isinstance(image_url, str):
            raise RuntimeError(f"Chapter {chapter['number']} image was not found")
        filename = f"chapter-{chapter['number']:02d}.jpg"
        (ASSETS_DIR / filename).write_bytes(download(session, image_url))
        chapter["image"] = f"assets/{filename}"

    book = {
        "id": "the-wonderful-wizard-of-oz",
        "title": "The Wonderful Wizard of Oz",
        "author": "L. Frank Baum",
        "illustrator": "W. W. Denslow",
        "publicationYear": 1900,
        "language": "en",
        "description": "Dorothy and Toto follow the yellow brick road through the Land of Oz in search of a way home.",
        "cover": "assets/cover.jpg",
        "source": {
            "name": "Project Gutenberg",
            "ebookNumber": 43936,
            "metadataUrl": METADATA_URL,
            "textUrl": SOURCE_URL,
            "retrievedFrom": SOURCE_URL,
            "sha256": source_hash,
            "rights": "Public domain in the USA; original text and illustrations are also out of copyright in the UK.",
            "editionNote": "Unabridged 1900 text with original W. W. Denslow chapter art. Illustration captions and Project Gutenberg boilerplate are not included in the reading text.",
        },
        "chapterCount": len(chapters),
        "wordCount": sum(int(chapter["wordCount"]) for chapter in chapters),
        "chapters": chapters,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Imported {book['chapterCount']} chapters and {book['wordCount']} words; "
        f"source sha256={source_hash}"
    )


if __name__ == "__main__":
    main()

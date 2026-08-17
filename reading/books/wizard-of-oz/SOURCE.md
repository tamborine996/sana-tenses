# The Wonderful Wizard of Oz — source and ingestion record

## Canonical source

- **Work:** *The Wonderful Wizard of Oz*
- **Author:** L. Frank Baum (1856–1919)
- **Illustrator:** W. W. Denslow (1856–1915)
- **First published:** 1900
- **Source edition:** Project Gutenberg eBook 43936
- **Metadata:** <https://www.gutenberg.org/ebooks/43936>
- **Imported HTML:** <https://www.gutenberg.org/cache/epub/43936/pg43936-images.html>
- **Source SHA-256 at import:** `91bc497a8c72864284312a6ce7f9a18a78c76329baba8f4a837a9fcda6506010`

Project Gutenberg marks this edition **public domain in the USA**. Baum died in 1919 and Denslow in 1915, so their original text and illustrations are also out of copyright in the UK under the ordinary life-plus-70-year term.

## Content policy

- The app contains all 24 chapters of the unabridged story.
- Narrative wording is taken from the source rather than modernised or adapted.
- Page-number artefacts, illustration captions and Project Gutenberg boilerplate are excluded from the reading body.
- The original Denslow cover and one original chapter-opening illustration are retained for every chapter.
- No modern adaptation, translation or copyrighted third-party illustration is included.

## Regenerate

From the repository root:

```bash
python reading/books/wizard-of-oz/scripts/import_gutenberg.py
```

The importer downloads the canonical HTML, checks the 24-chapter sequence, writes `data/book.json`, downloads the cover and chapter-opening art, and records the source hash in the generated data.

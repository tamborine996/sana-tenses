# Sana’s Reading Library

A phone-first, tutor-led reading routine inside the existing Sana Tenses GitHub Pages site.

## Included reading experiences

- `/reading/` — the reading-library shelf plus the current short English-practice article, with a complete English/Urdu story switch and bilingual Easy/Challenge verbal questions.
- `/reading/?article=<article-id>#reader` — a stable link to any short article on the shelf.
- `/reading/books/wizard-of-oz/` — the complete public-domain *Wonderful Wizard of Oz*, one chapter at a time, with saved progress and original W. W. Denslow chapter art.

## Short-article product contract

- Keep every published article visible on the library shelf, while showing one calm current reading at a time below it.
- Use a faithful 300–500 word adaptation, not a word-for-word republication.
- Credit and link the original source clearly.
- Keep English canonical. When an Urdu translation is supplied, align its title, standfirst and body paragraphs with the English story.
- Give each language its own semantic `lang` and `dir`; Urdu is `lang="ur" dir="rtl"` and uses the Noto Nastaliq Urdu reading font.
- Switching language must not reset or hide an already-open question session.
- Hide the questions until the reader deliberately finishes the article.
- Provide an Easy/Challenge switch with exactly ten verbal questions in each set, with English prompts and Urdu help together.
- Easy question 1 must ask what happens in the text; the rest should check direct understanding and build confidence.
- Challenge questions should move beyond recall and practise past, present and future language.
- Include no answer boxes, scores or automated marking.

## Add an article

1. Add the newest item to `data/articles.json` with a unique date-based ID.
2. Keep the adapted English body between 300 and 500 words.
3. If adding Urdu, place `title`, `standfirst` and a paragraph-aligned `paragraphs` array under `translations.ur`.
4. Add exactly ten Easy and ten Challenge questions, plus aligned Urdu `prompt` and `support` translations under `questionTranslations.ur`.
5. Run the full content, browser and accessibility suite.

Every valid article automatically appears on the shelf. The item with the newest `date` opens by default; selecting a shelf card opens that article using its stable `?article=<id>#reader` URL. The chapter book is kept on the same shelf and links to its dedicated reader.

## Re-import The Wonderful Wizard of Oz

The reader is generated deterministically from Project Gutenberg eBook 43936:

```bash
python reading/books/wizard-of-oz/scripts/import_gutenberg.py
```

The importer verifies the 24-chapter structure, downloads the original cover and chapter art, records the source SHA-256, and writes `books/wizard-of-oz/data/book.json`. See `books/wizard-of-oz/SOURCE.md` for provenance and rights notes.

## Test

```bash
npm install --prefix reading
npm test --prefix reading
```

The suite validates both data contracts, exercises the library, stable article selection, language and chapter navigation, checks saved progress, verifies no horizontal overflow at 320px, 360px and 412px, and runs automated WCAG A/AA checks on English, Urdu, questions and the chapter book.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/reading/`
- `http://localhost:4173/reading/books/wizard-of-oz/`

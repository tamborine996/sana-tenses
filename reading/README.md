# English Reading Practice

A phone-first, tutor-led reading routine inside the existing Sana Tenses GitHub Pages site.

## Product contract

- Show one calm current reading at a time.
- Use a faithful 300–500 word adaptation, not a word-for-word republication.
- Credit and link the original BBC source clearly.
- Prefer accessible non-geopolitical topics while the routine is being established.
- Hide the questions until the reader deliberately finishes the article.
- Include exactly five verbal questions and no answer boxes, scores or automated marking.
- Question 1 must ask what happens in the text.
- Questions 2–5 should become gradually more thoughtful and practise past, present and future language.

## Add an article

1. Add the newest item to `data/articles.json` with a unique date-based ID.
2. Keep the adapted body between 300 and 500 words.
3. Add exactly five questions following the product contract above.
4. Run:

```bash
node reading/tests/validate.mjs
```

The page automatically displays the item with the newest `date`.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/reading/`.

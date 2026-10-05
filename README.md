# Stillpoint

A calm, matte-black study space: a Pomodoro timer, a plan for the day, focus sounds and music, and active-recall quizzes built from your own notes.

## Features

**Focus**
- Pomodoro timer with Classic (25/5), Deep (50/10), Ultradian (90/20) and Sprint (15/3) presets, or set your own lengths
- Before each block you can write down what you plan to do. Afterwards you rate your focus and write a one-line summary from memory
- Break suggestions such as the 20-20-20 eye rule, moving around, and an animated box-breathing guide
- A parking lot where you can write down a distracting thought and get back to work
- Zen mode (`Z`), keyboard shortcuts, desktop notifications, and the time left shown in the browser tab

**Today**
- Add assignments with a subject and an estimate of how many focus blocks they need. Each finished block is counted
- Unfinished tasks from earlier days can be moved to today
- You can link a set of notes to a task, so checkpoint quizzes ask about what you're studying

**Sound**
- Focus sounds generated in the browser, in the style of brain.fm: brown, pink or white noise, rain, ambient pads, amplitude modulation (theta/alpha/beta/gamma) and binaural beats
- Six presets plus a mixer. The sounds can play only during focus blocks if you want
- Built-in lyric-free YouTube streams and Spotify playlists, and you can add your own YouTube, Spotify or SoundCloud links

**Learn**
- Paste notes or import a `.txt` or `.md` file. Stillpoint turns them into flashcards, fill-in-the-blanks and "explain it" prompts
- At a set point in each focus block (15 minutes by default) a **recall checkpoint** appears. You can take a 3-question quiz or write down everything you remember
- A short warm-up quiz when a block starts (pre-testing)
- Spaced repetition: cards you get wrong come back soon, and cards you know come back further apart
- A Strategies guide covering active recall, spacing, interleaving, elaboration, the Feynman technique, dual coding and more

**Progress**: minutes focused today, your streak, recall accuracy, a chart of the last 7 days, time per subject, your average focus rating, and recent blocks with your recall notes.

**Customize**: accent colours, animated backgrounds (aurora, ember, deep sea, forest, dusk, night sky, rain), an image URL, or your own uploaded image, with sliders for dim and blur.

All data stays in your browser's local storage, with no account. Use Settings → Export backup to move your data to another device.

### Notes format

```
# Heading                      → "explain in your own words" prompt
Term :: definition             → flashcard
Q: question                    → question
A: answer
What is X?                     → question (answer on the next line)
answer
Term - definition              → flashcard
Key word in **bold** or ==highlight==  → fill-in-the-blank
```

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Deploy to Vercel

1. Go to https://vercel.com/new and import this GitHub repository.
2. Vercel detects Vite automatically (`vercel.json` is included). Click **Deploy**.

After that, every push to the repository deploys automatically.

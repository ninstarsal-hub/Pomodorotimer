# Stillpoint

**Live:** https://pomodorotimer-ochre.vercel.app/

A calm, matte-black study space: a Pomodoro timer, a plan for the day, focus sounds and music, and active-recall quizzes built from your own notes.

## Features

**Focus**
- Pomodoro timer with Classic (25/5), Deep (50/10), Ultradian (90/20) and Sprint (15/3) presets, or set your own lengths
- Before each block you can write down what you plan to do. Afterwards you rate your focus and write a one-line summary from memory
- Research-backed break ideas: doodling, drawing what you learned, going outside, an exercise snack, a brain dump, a power nap on long breaks, and more, each with a one-line summary of the study behind it. Breaks follow a recommended plan: doodle after the first block, a walk outside after the second, eyes-closed rest after the third, then a proper recharge (move, eat, maybe nap) on the long break. The plan can be turned off in Settings. Tap "Another idea" to shuffle, or browse the full list under Strategies
- Break tools: a doodle pad (save your doodle as a PNG), an animated box-breathing guide, and break beats
- A parking lot where you can write down a distracting thought and get back to work
- Zen mode (`Z`), keyboard shortcuts, desktop notifications, and the time left shown in the browser tab

**Today**
- Add assignments with a subject and an estimate of how many focus blocks they need. Each finished block is counted
- Unfinished tasks from earlier days can be moved to today
- You can link a set of notes to a task, so checkpoint quizzes ask about what you're studying

**Sound**
- Focus sounds generated in the browser, in the style of brain.fm: brown, pink or white noise, rain, café murmur, fireplace, ocean waves, ambient pads, amplitude modulation (theta/alpha/beta/gamma) and binaural beats
- Six presets plus a mixer. The sounds can play only during focus blocks if you want
- Built-in lyric-free YouTube streams and Spotify playlists, and you can add your own YouTube, Spotify or SoundCloud links
- Break music: lofi, chillhop and deep-house beats generated in the browser (free, offline, no account), which can start automatically on breaks and stop when focus resumes. Also includes upbeat break playlists and your own break links

**Learn**
- Upload notes, slides or study guides: PDF, Word (`.docx`), PowerPoint (`.pptx`, including speaker notes), `.txt`, `.md`, `.html` or `.rtf`. You can also paste text or drag files in. Files are read in your browser
- Stillpoint turns notes into flashcards, fill-in-the-blanks and "explain it" prompts, and skips instructions and logistics like "Read chapter 4" or "Due Friday". Everything runs in your browser, so it's free
- **Edit questions:** fix or delete any generated question, or add your own. Edits are kept even when you change the notes
- **Sections:** notes are split into sections by headings (`# Session 3`, `## Topic`) or lines like `Session 3: Cell respiration` / `Lecture 5 - Genetics`. Pick the section you're studying under the timer, and check off sections you've already covered. Quizzes only use those: checkpoints ask mostly about the current section plus one review question from an earlier studied section (in any class), and warm-ups review earlier sections that are due
- **Generate quiz:** build a practice test whenever you want. Pick the classes and sections, the question types (multiple choice, true/false, short answer, fill in the blank, explain) and the number of questions. Practice mode gives feedback after each question; Exam mode scores you at the end, with a breakdown by section and a "retry missed" button. Questions are reworded and asked from different directions (term → definition, definition → term, true/false on look-alike answers), so you can't pass by recognizing the exact wording. You can also run a quiz as a focus block
- At a set point in each focus block (15 minutes by default) a **recall checkpoint** appears. You can take a 3-question quiz or write down everything you remember
- A short warm-up quiz when a block starts (pre-testing)
- Spaced repetition: cards you get wrong come back soon, and cards you know come back further apart
- A Strategies guide covering active recall, spacing, interleaving, elaboration, the Feynman technique, dual coding and more

**Math & problem-solving courses**
- **Math display:** write math between dollar signs (`$\frac{x^2}{2}$`, `$$\int_0^1 x\,dx$$`) in notes, problems and answers, and it renders properly
- **Smart answer checking:** `0.5` = `1/2` = `50%`, `2(x+0.5)` = `2x+1`, `3.14` ≈ π, `x = 2, 3` in any order, `±` answers, and simple LaTeX in either the answer or the response
- **Practice problems:** log textbook or worksheet problems (`1-29 odd, 34, 4a-4d`), mark each right, wrong or "needed help", and optionally add the problem text and a final answer to check automatically. Missed problems come back to re-solve after 1, 3 and 7 days until you get them right three times in a row
- **Mixed practice:** problems drawn at random across sets, so you practise choosing the right method
- **Mistake log:** tag why you missed a problem (concept, setup, algebra, careless). Progress shows where your points go, with a tip for your most common mistake type

**Plan**
- **Exam planner:** add an exam date and the sections it covers. Stillpoint schedules when to learn each new section and when to review each one, at about 14, 7 and 3 days before the exam plus a final review the day before. The plan is rebuilt every day, so a missed day just rolls forward instead of piling up. A Calendar view shows the plan for all your exams by month, with colour-coded days for learning, reviews, final reviews and exams. Tap a day to see what to do
- **Exam countdown:** a small box at the top shows days until your next exam and how ready you are. Arrows step through upcoming exams, clicking it lists them all, and you can hide it (and bring it back from the calendar icon)
- **Today card on the main screen:** shows how many review questions are due (with a time estimate) and today's exam-plan tasks, each with a one-click Study or Quiz button
- **Readiness:** each exam's questions count in full once you've got them right 3 times on separate reviews, partly before that, and less when they're overdue for review. The exam card shows how many are solid, learning, fading or not yet answered right
- **Calendar export:** download your plan and exam days as an .ics file for Google Calendar, Apple Calendar or Outlook, with 9am reminders
- **Cram mode:** when an exam is 2 days away or less, a "Cram" button quizzes your 12 weakest questions for it, bringing back anything you miss until you get it
- **Goals:** daily and weekly focus-minute goals, a progress ring in the corner, and streaks that only count days you hit your goal

**Study sessions**
- Focus blocks are grouped into study sessions (a morning session and a night session are separate). A block started after a gap of 2½ hours or more, such as the next day or the evening after a morning session, starts a new session and resets the block count, so breaks follow the new set
- **End session** (bottom of the main screen) lets you rate the whole session from 1 to 5 and tick what was true: stayed hydrated, phone away, slept well, moved on breaks, doodled, focus sounds, lights low, studied away from home, and more, or add your own. Things Stillpoint saw you use (focus sounds, break music, the doodle pad) are pre-ticked. Ending also resets the block count
- Progress lists your recent sessions with what you worked on in each block, your per-block and overall ratings, and what you ticked. Unrated sessions can be rated later
- **What works for you:** after 3 rated sessions, Stillpoint looks for patterns: your best time of day, habits that go with better (or worse) focus, what matters most in morning vs. night sessions, and the block where your focus usually drops

**Progress**: minutes focused today, goals, **mastery by section** (weakest first, with a "Quiz my weakest sections" button), your streak, recall accuracy, a chart of the last 7 days, time per subject, your average focus rating, and recent blocks with your recall notes.

**Customize**: accent colours, illustrated scenes (mountains, café, lakeside, dunes, city night) with optional gentle motion, animated backgrounds (aurora, ember, deep sea, forest, dusk, night sky, rain), an image URL, or your own uploaded image, with sliders for dim and blur.

**Install it as an app (free):** in Chrome or Edge, click **Install app** in the top bar (or the install icon in the address bar). In Safari on a Mac, use **File → Add to Dock**; on iPhone, **Share → Add to Home Screen**. The installed app opens in its own window with a Dock/taskbar icon, works offline, and updates itself. When a new version is published, a "Refresh" prompt appears.

**Answer checking:** typed answers are marked right, **close** (you have most of the key words, so you decide) or not quite, with the key words you got and missed. Quizzes work from the keyboard: `1`–`4` pick an option or grade (Again / Hard / Good / Easy), `Y` / `N` mark a close answer, and `Enter` moves on.

**New here?** First-time visitors get a short intro and can try everything with example notes and an example exam.

All data stays in your browser's local storage, with no account. **Settings → Export backup** saves everything (notes, progress, exams, settings and your background image) to one file that you can import on another computer or browser. If you haven't backed up in a week, a reminder appears.

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

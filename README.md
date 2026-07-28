# Nūs

**Jarvis for students. Drop in your syllabi, get an AI that runs your entire semester.**

**Website:** [potlakai.github.io/nus](https://potlakai.github.io/nus/)

> ⭐ **If Nūs is useful to you, [star this repo](https://github.com/potlakai/nus).** Stars are how other students find it.

*Nūs* (from the Greek *noûs*, the mind) is an AI semester organizer built on Claude Code. Every "AI assistant" demo you've seen needs weeks of context before it's smart about you. Nūs gets there in 5 minutes, because as a student, your whole life is already written down in 3 to 5 PDFs. You just never had anything that read them.

## What it does

- **`/setup`** learns who you are and what you're aiming for, then reads your syllabus PDFs and builds a master deadline calendar for your whole semester, flags your crunch weeks, and writes a page per class.
- **`/due`** answers "what's due tonight?" from *your* syllabi, instantly.
- **`/brief`** is a morning brief: what's due today, what's coming this week, what to start early, and your one focus.
- **`/quest`** gives you 3 small daily quests from your deadlines, goals, and skill tracks. Binary pass/fail, 20 to 45 min each. Solo-leveling, but for your real life.
- **`/level <skill>`** lets you pick anything you want to get better at (public speaking, Java, writing). It builds a Lv1→Lv10 path and quietly weaves the daily reps into your quests. Miyagi mode.
- **`/capture`** takes anything you dump in (lecture notes, an idea, a thought), cleans it, tags it, and files it. Everything you capture makes it smarter about you.

## Quick start (10 minutes)

1. Install [Claude Code](https://claude.com/claude-code) (needs a Claude subscription).
2. In a terminal, run:

   ```
   npx create-nus
   ```

   (Prefer a zip? [Download Nūs](https://github.com/potlakai/nus/releases/latest) and unzip it instead.)
3. Drop your syllabus PDFs into `school/raw/`.
4. Run `claude` in the folder and type `/setup`. Watch it build your semester.
5. Tomorrow morning, type `/brief`.

If it just built your semester in one shot, [leave a star](https://github.com/potlakai/nus) so the next student finds it too.

## Privacy

Everything lives in plain markdown files **on your machine**. No server, no database, no account with us. You can open every file it writes. Delete the folder and it's gone.

## Why this exists

I built a Jarvis-style AI system for myself on Claude Code. It knows my classes, deadlines, notes, and goals, and it briefs me every morning. The first time it warned me about a crunch week I hadn't noticed, I realized every student should have this. Nūs is the smallest version of that system that anyone can install, and the first piece of something bigger: an AI that organizes your whole life because it actually knows you.

## Roadmap

Canvas/Blackboard sync · GPA projections · Google Calendar dashboard · email triage · a hosted version that doesn't need Claude Code. Want one of these first? [Join the waitlist](https://potlakai.github.io/nus/) and tell us. Loudest requests get built first.

#!/usr/bin/env node
// create-nus — scaffolds Nūs, the AI semester organizer built on Claude Code.
// Usage: npx create-nus [directory]   (default directory: nus)

const fs = require("fs");
const path = require("path");

const arg = process.argv[2];

if (arg === "--help" || arg === "-h") {
  console.log(`
  create-nus — scaffold Nūs, the AI semester organizer

  Usage:
    npx create-nus            create a ./nus folder
    npx create-nus my-folder  create it somewhere else

  Then: drop your syllabus PDFs in school/raw/, run \`claude\`, type /setup.
  Docs: https://github.com/potlakai/nus
`);
  process.exit(0);
}

const targetName = arg || "nus";
const dest = path.resolve(process.cwd(), targetName);
const template = path.join(__dirname, "..", "template");

if (!fs.existsSync(template)) {
  console.error("create-nus: template files are missing from this package. Please report this at https://github.com/potlakai/nus/issues");
  process.exit(1);
}

if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
  console.error(`create-nus: "${targetName}" already exists and is not empty. Pick a new folder name:\n  npx create-nus my-nus`);
  process.exit(1);
}

fs.cpSync(template, dest, { recursive: true });

// npm strips .gitignore from published packages, so it ships as "gitignore"
const gi = path.join(dest, "gitignore");
if (fs.existsSync(gi)) fs.renameSync(gi, path.join(dest, ".gitignore"));

fs.mkdirSync(path.join(dest, "school", "raw"), { recursive: true });

const rel = path.relative(process.cwd(), dest) || ".";

console.log(`
   ╔═╗
   ║ ║  N Ū S — your semester brain is scaffolded.
   ╚═╝

   Next (10 minutes, once):

   1. cd ${rel}
   2. Drop your syllabus PDFs into school/raw/
   3. Run: claude        (needs Claude Code: npm i -g @anthropic-ai/claude-code)
   4. Type: /setup       and watch it build your whole semester

   Tomorrow morning: /brief

   Everything stays in plain files on your machine. No server, no account.
   Useful? Star it so the next student finds it: https://github.com/potlakai/nus
`);

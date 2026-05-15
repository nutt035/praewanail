# README — AI Team System Quick Start

---

## File Structure (copy this into every project)

```
your-project/
├── CLAUDE.md           ← AI reads this automatically — the "brain"
├── prd.md              ← What the project is and who it's for
├── architecture.md     ← Tech stack, folder structure, database
├── rules.md            ← Coding conventions
├── agents.md           ← AI team roles
├── memory.md           ← Key decisions + things AI must remember
├── tasks.md            ← Phased task list
├── marketing.md        ← Content strategy + sales plan
└── src/                ← Your actual code
```

---

## Most Used Prompts

### Start a new session
```
Read CLAUDE.md, prd.md, architecture.md, and tasks.md.
Tell me: where is the project right now, and what should we do next?
```

### Do the next task
```
Check tasks.md and complete the next incomplete task.
Reference architecture.md and rules.md.
Teach me why you're doing it this way.
```

### Audit existing code
```
Review all the code in this project as a Senior Developer.
Tell me: 1) what's good, 2) what needs improvement, 3) what must be fixed urgently.
Then update tasks.md with your findings.
```

### Marketing content
```
@Marketing write a [IG caption / TikTok script / promotion]
for [context or occasion].
Use the tone and target audience from marketing.md.
```

### Learn a concept
```
@Mentor explain [concept] as if I'm a complete beginner.
Use an example from this project.
```

---

## Starting a New Project

1. Copy `CLAUDE.md` to the root of the new project
2. Copy all template `.md` files and update them for the new project
3. Fill in `prd.md` first — it's the most important file
4. Open Claude Code and use the "Start a new session" prompt above

---

## Key Habits

- **Update `memory.md`** every time a key decision is made
- **Update `tasks.md`** when a task is finished or a new one is discovered
- **Always ask "why"** — the AI will explain any concept from the codebase
- **Commit often** using the git commit format in `rules.md`

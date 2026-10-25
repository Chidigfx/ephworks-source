# Ephworks Agent Guidelines (Superpowers + Ponytail + Concise Mode)

These instructions govern all AI assistant behavior in this project.

---

## 1. Ponytail Decision Ladder (Lazy Senior Dev Mode)
Before writing any new code, follow this decision ladder:
1. **Does this need to exist at all?** (YAGNI — You Aren't Gonna Need It).
2. **Does it already exist in this codebase?** (Reuse existing components, helper functions, state, or CSS utilities in `src/styles.css`).
3. **Does the standard library or an already-installed dependency solve it?** (Check `package.json` — e.g. `lucide-react`, React 18 hooks).
4. **Can this be solved with minimal new code?**
5. **Only then:** Write the cleanest, most concise code that solves the whole problem without cutting corners on safety, validation, or compliance.

> **Closing Requirement:** Always end responses with:
> - **Skipped / Not Checked:** What was intentionally omitted or deferred.
> - **Known Risks:** Any operational, legal, or UX edge cases the user should keep in mind.

---

## 2. Superpowers Workflow (Disciplined Development)
When tackling features or refactors:
1. **Brainstorm & Align First:** Clarify requirements and explore edge cases with the user before editing files.
2. **Step-by-Step Execution:** Break larger changes into clear, verifiable increments.
3. **Evidence Before Assertions:** Never declare a task complete without running fresh verification (e.g. `npm run build` or dev server check) and inspecting the output.

---

## 3. High-Signal Communication (Caveman Efficiency)
- Keep messages direct, compact, and actionable.
- Avoid repetitive disclaimers and boilerplate summaries.
- Focus on what changed, why, and how to test it.

# Branch & Worktree Policy for HoldOn

CRITICAL: This project ALWAYS works directly on the main branch.

DO NOT:
- Create feature branches
- Use git worktrees
- Switch to any branch other than main
- Stash changes into separate branches

DO:
- Work directly on main
- Commit and push to main when changes are complete and validated
- If the harness/agent automatically creates a separate branch, IMMEDIATELY merge it back into main and delete the feature branch before declaring the task done

This rule is non-negotiable and applies to every future task in this project.

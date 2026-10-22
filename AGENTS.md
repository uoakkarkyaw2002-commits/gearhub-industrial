# GearHub — Permanent Instructions

These rules apply to all future GearHub tasks, within their applicable scope.

## 1. Minimize Usage
- Minimize token consumption and unnecessary tool calls.
- Inspect only files relevant to the requested task.
- Avoid repeated searches, builds, and tests.
- Do not scan the entire repository unless necessary.
- Use the smallest possible code changes.
- Stop when the requested task is complete.

## 2. Reference Design Accuracy
- Treat uploaded screenshots as the primary design reference.
- Match spacing, layout, colors, typography, dimensions, and alignment as closely as possible.
- Never redesign unrelated elements.
- Do not add anything that was not requested.
- Do not substitute a conceptual preview for the actual implementation.

## 3. Mobile and Desktop Protection
- Preserve existing mobile and desktop layouts.
- Changes to mobile must not break desktop.
- Changes to desktop must not break mobile.
- Check both layouts when changes may affect both.

## 4. Actual Visual Verification
- When browser tools are available, verify the actual implemented page.
- Compare screenshots at matching viewport sizes.
- Fix relevant visual differences.
- Limit repeated screenshot and verification attempts to avoid excessive usage.
- If visual verification is unavailable, clearly report it.

## 5. Protect Existing Functionality
- Do not modify unrelated features.
- Do not refactor unrelated code.
- Do not change database structures or APIs without explicit permission.
- Preserve existing functionality.

## 6. Task Completion
- Never claim success without completing the implementation.
- Run only essential checks.
- Report which files were changed.
- Clearly identify incomplete or unverified work.
- If blocked, explain the reason instead of repeatedly attempting the same approach.

## 7. Follow Instructions Exactly
- If one change is requested, make only that change.
- Do not introduce additional features.
- Do not make assumptions about unclear requirements.
- Ask for clarification only when essential.

## 8. Permanent Project Rules
- This file lives in the root `AGENTS.md`.
- Follow it for all future GearHub tasks within its applicable scope.
- Do not overwrite an existing `AGENTS.md` without checking and preserving its important rules.

1. **Gather Changes**:<execute_command<command>git status && git diff src scripts | head -10000</command></execute_command>
2. **Summarize Changes**: Based on the diff above, list the key changes. Determine which Memory Bank files or docs might need updates (e.g., if a feature was completed or a TODO addressed).
3. **Update Memory Bank**: Open @memory-bank/activeContext.md and @memory-bank/progress.md. Remove any completed TODOs and add notes on the changes (if any new patterns or decisions were introduced).
4. **Update Docs**: Open @README.md and @DEVELOPMENT.md. Remove or update any references to the now-completed items (e.g., delete outdated “done” tasks in changelogs or todo lists). Reflect any new installation or usage info if applicable.
5. **Commit**: Generate a concise commit message describing the changes. <execute_command><command>git add -A && git commit -m "$COMMIT_MESSAGE"</command></execute_command>
6. **Push**:<execute_command<commandnd>git push</command></execute_command>

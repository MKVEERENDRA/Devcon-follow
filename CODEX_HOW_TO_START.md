# How to start Codex with this project

## The simplest reliable route: local Codex with the extracted repository
1. Download `devcon-follow-codex-ready-2026-10-18.zip` and extract it. Inside should be folder `devcon-follow/` containing `AGENTS.md`, `CODEX_MASTER_TASK.md`, `src/`, `web/`, `mobile/`.
2. On a Mac/Windows/Linux computer, install Codex CLI from https://github.com/openai/codex (or use the Codex app/IDE extension).
3. Open a terminal in `devcon-follow/`; run `codex`, and sign in with your ChatGPT account.
4. Paste: `Read AGENTS.md and CODEX_MASTER_TASK.md. You have full permission to implement and test code in this repository now. Begin with dependency installation and end-to-end validation. Push changes to MKVEERENDRA/Devcon-follow using my authenticated git credentials when authorized; deploy to existing Railway/Atlas only after staging smoke tests. Do not produce a plan-only answer. Keep track of explicit blockers and move on to independent tasks.`
5. With appropriate authenticated git permissions, push the extracted source into https://github.com/MKVEERENDRA/Devcon-follow (if empty). Codex Web/Cloud can then be linked to that repository at https://chatgpt.com/codex.

## If starting with Codex Cloud
- Cloud needs a repository/environment that actually contains the source. Merely linking an empty GitHub repository to ChatGPT does NOT upload this ZIP.
- Push the extracted source to the repository first, then create a Codex environment for `MKVEERENDRA/Devcon-follow` and paste the same command as step 4.
- For deployment credentials, add secrets via Codex environment/approved service controls, never through chat or git commits.

## Common mistaken assumption
The general GitHub ChatGPT connector may permit reading while refusing writes (HTTP 403). Codex's own approved authenticated local git or cloud repository connection must have write permission. A ZIP file does not magically become deployed by connecting GitHub.

## When Codex needs your action
- OIDC auth provider and allowed redirect URLs
- Authorized official Devcon ticket-verification API access (otherwise use carefully labeled invitation-only community access as described in the task)
- Approved public venue/landmarks
- Secure MongoDB network connection
- Android/iOS app-store signing or internal-distribution credentials
- Physical Android/iPhone hardware for Bluetooth interoperability tests

See `AGENTS.md` and `CODEX_MASTER_TASK.md` for exact build requirements and acceptance gates.

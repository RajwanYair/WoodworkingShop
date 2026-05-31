# Copilot And Git Hooks

This folder contains reusable local hook scripts for development safety.

## Available Hooks

- `pre-commit-quality.ps1` (Windows PowerShell)
- `pre-commit-quality.sh` (Linux/macOS Bash)

Both scripts run a lightweight quality gate before commit:

1. `npm run quality:fast`
2. `npm run test -- --runInBand` fallback if needed

## Suggested Setup

PowerShell (Windows):

```powershell
Copy-Item .github/hooks/pre-commit-quality.ps1 .git/hooks/pre-commit.ps1
```

Bash (Linux/macOS/WSL):

```bash
cp .github/hooks/pre-commit-quality.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Notes

- Hooks are optional and local-only.
- CI remains the source of truth for merge gating.
- Scripts keep all temporary artifacts in `$TEMP` or `/tmp`.

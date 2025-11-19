## Personal AI Infrastructure – Fork & Git Remote Policy

This repository is a **private fork** of `danielmiessler/Personal_AI_Infrastructure`.

### Remotes

- `origin` (writeable, default push target):
  - `git@github.com:mellanon/pai-1.2.git`
  - All normal development work, feature branches, and tags should be pushed here.

- `upstream` (read-only, no pushes):
  - `https://github.com/danielmiessler/Personal_AI_Infrastructure.git`
  - Used only for pulling changes, e.g.:
    - `git fetch upstream`
    - `git merge upstream/main` or `git rebase upstream/main`

### Golden rule: never push to `upstream`

- Do **not** run:
  - `git push upstream ...`
  - `git push --all upstream`
  - `git push --tags upstream`
- All pushes should go to `origin` unless the owner explicitly and knowingly instructs otherwise.

### Typical update workflow

```bash
git fetch upstream
git checkout main
git merge upstream/main   # or: git rebase upstream/main
git push origin main
```

This keeps the private fork up to date while ensuring the original upstream remains untouched.



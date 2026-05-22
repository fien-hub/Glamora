#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

current_branch="$(git branch --show-current)"
current_commit="$(git rev-parse --short HEAD)"
current_subject="$(git log -1 --pretty=%s)"

status_short="$(git status --short)"

baseline_tags="$(git tag --list 'testflight-splash-pass-*' 'stabilized-baseline-*' | sort)"
head_tags="$(git tag --points-at HEAD | sort)"

echo "=== Glamora Release Check ==="
echo "Project: $PROJECT_ROOT"
echo "Branch:  $current_branch"
echo "Commit:  $current_commit"
echo "Message: $current_subject"
echo

echo "Working tree:"
if [[ -z "$status_short" ]]; then
  echo "  clean"
else
  echo "$status_short" | sed 's/^/  /'
fi

echo
if [[ -z "$head_tags" ]]; then
  echo "Tags on HEAD: none"
else
  echo "Tags on HEAD:"
  echo "$head_tags" | sed 's/^/  /'
fi

echo
if [[ -z "$baseline_tags" ]]; then
  echo "Baseline tags found: none"
else
  echo "Baseline tags found:"
  echo "$baseline_tags" | sed 's/^/  /'
fi

echo
echo "Safe release commands (run from this directory):"
echo "  cd $PROJECT_ROOT"
echo "  git fetch origin"
echo "  git checkout main"
echo "  git pull --ff-only origin main"
echo "  npm run release:check"
echo "  eas build --platform ios --profile production"
echo "  eas submit --platform ios --profile production --latest"

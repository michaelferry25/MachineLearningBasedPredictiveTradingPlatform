#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_FILE="$ROOT_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file in $ROOT_DIR"
  if [[ -f "$EXAMPLE_FILE" ]]; then
    echo "Create one with: cp .env.example .env"
  else
    echo "Create .env with FINNHUB_API_KEY and NEWS_API_KEY"
  fi
  exit 1
fi

# Load env for backend/frontend tooling
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "Missing frontend dependencies. Run: (cd frontend && npm install)"
  exit 1
fi

missing=()
for key in FINNHUB_API_KEY NEWS_API_KEY; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if (( ${#missing[@]} )); then
  echo "Missing required env vars: ${missing[*]}"
  echo "Set them in .env and re-run."
  exit 1
fi

# Defaults for frontend if not set
: "${VITE_API_URL:=http://localhost:8080}"
: "${VITE_ML_API_URL:=http://localhost:5001}"
export VITE_API_URL VITE_ML_API_URL

ML_PYTHON="python"
if [[ -x "$ROOT_DIR/ml-service/venv/bin/python" ]]; then
  ML_PYTHON="$ROOT_DIR/ml-service/venv/bin/python"
else
  echo "Warning: ml-service/venv not found. Using system python."
  echo "If ML service fails, create venv and install deps in ml-service."
fi

pids=()

cleanup() {
  echo "Shutting down services..."
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup INT TERM EXIT

(
  cd "$ROOT_DIR/backend"
  ./gradlew bootRun
) &
pids+=("$!")

(
  cd "$ROOT_DIR/ml-service"
  "$ML_PYTHON" app.py
) &
pids+=("$!")

(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
pids+=("$!")

echo "Services starting..."
wait

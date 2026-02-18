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

if [[ -z "${JWT_SECRET:-}" ]]; then
  echo "Warning: JWT_SECRET is not set. Backend will use an insecure default."
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

kill_tree() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  local children
  children=$(pgrep -P "$pid" 2>/dev/null || true)
  for child in $children; do
    kill_tree "$child"
  done

  kill "$pid" 2>/dev/null || true
}

cleanup() {
  echo ""
  echo "Shutting down services..."
  for pid in "${pids[@]:-}"; do
    kill_tree "$pid"
  done
  # Give processes a moment to close, then force kill any that are still around
  sleep 1
  # Force kill anything still on our ports
  for port in 8080 5001 5173; do
    local stuck
    stuck=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$stuck" ]]; then
      kill -9 $stuck 2>/dev/null || true
    fi
  done
  echo "All services stopped."
}

trap cleanup INT TERM EXIT

(
  cd "$ROOT_DIR/backend"
  ./gradlew bootRun --no-daemon
) &
pids+=("$!")

(
  cd "$ROOT_DIR/ml-service"
  export FLASK_DEBUG=1
  "$ML_PYTHON" -m flask --app app run --host 0.0.0.0 --port 5001 --no-reload
) &
pids+=("$!")

(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
pids+=("$!")

echo "Services starting..."
wait

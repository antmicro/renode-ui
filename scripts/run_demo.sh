#!/usr/bin/env bash

set -euo pipefail

RENODE_PID=""

cleanup() {
  if [[ -n "${RENODE_PID}" ]] && kill -0 "${RENODE_PID}" 2>/dev/null; then
    echo "Shutting down Renode (PID ${RENODE_PID})..."
    kill "${RENODE_PID}"
    wait "${RENODE_PID}" 2>/dev/null || true
  fi
}

# Ensure cleanup runs on any exit reason
trap cleanup EXIT INT TERM

# -----------------------
# Flag parsing
# -----------------------
REBUILD=false
DEBUG_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --debug)
      DEBUG_BUILD=true
      ;;
    --rebuild)
      REBUILD=true
      ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

if [[ ! -d "renode-portable" ]]; then
  echo "Required dependencies missing. Installing renode..."
  ./scripts/install_renode.sh
else
  echo "All required dependencies are present."
fi

# -----------------------
# Rebuild or assert resources exist
# -----------------------
if [ "$REBUILD" = true ]; then
  echo "Rebuild flag detected. Running build script..."
  DEBUG_BUILD="$DEBUG_BUILD" ./scripts/build_neutralino.sh
else
  if [ ! -d "neutralino/resources/_app" ]; then
    echo "Error: neutralino/resources/_app does not exist."
    echo "Run with --rebuild to generate it."
    exit 1
  fi
fi


# -----------------------
# Start Renode server
# -----------------------
echo "Starting Renode server..."
./renode-portable/renode --server-mode &
RENODE_PID=$!
echo "Renode started with PID ${RENODE_PID}"

# -----------------------
# Run Neutralino
# -----------------------
cd neutralino
npm install
if [ "$DEBUG_BUILD" = true ]; then
  npm run build:neutralino-dbg
  ./dist/renode-ui-dbg/renode-ui-dbg-linux_x64
else
  npm run build:neutralino
  ./dist/renode-ui/renode-ui-linux_x64
fi


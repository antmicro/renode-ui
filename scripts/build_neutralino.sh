#!/usr/bin/env bash
set -e

MAIN_DIR=$(realpath $(dirname $(dirname "$0")))
cd $MAIN_DIR

if [[ -n "$CI" && -d "frontend/build" ]]; then
  echo "Skipping frontend build."
else
  if [[ -n "$CI" ]]; then
    npm ci --prefix="frontend/"
  else
    npm i --prefix="frontend/"
  fi

  if [[ -n "$LINKED_WS_API" ]]; then
    cd frontend; npm link renode-ws-api; cd ..
  fi

  VITE_DEBUG_BUILD="$DEBUG_BUILD" VITE_NEUTRALINO=true npm run build:web --prefix="frontend/"
fi

# Copy the renode-ui static web page to neutralino builder
mkdir -p neutralino/resources
cp -r frontend/build/* neutralino/resources

if [[ -d "node_modules" ]]; then
  echo "Neutralino already installed"
else
  if [[ -n "$CI" ]]; then
    npm ci --prefix="neutralino/"
  else
    npm i --prefix="neutralino/"
  fi
fi

# Build the standalone neutralino bundle
if [ "$DEBUG_BUILD" = true ]; then
  npm run build:neutralino-dbg --prefix="neutralino/"
else
  npm run build:neutralino --prefix="neutralino/"
fi
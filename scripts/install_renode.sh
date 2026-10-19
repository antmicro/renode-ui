#!/usr/bin/env bash
set -e

MAIN_DIR=$(realpath $(dirname $(dirname "$0")))
cd $MAIN_DIR

ARCH="$(uname -m)"
OS="$OSTYPE"

WS_API_BUILD=$(grep -o 'typescript+[0-9]*git[0-9a-f]*' frontend/package.json)
RENODE_SHA="${WS_API_BUILD#*git}"
RENODE_VERSION=$(wget -qO- "https://raw.githubusercontent.com/renode/renode/$RENODE_SHA/tools/version")
RENODE_BUILD="renode-$RENODE_VERSION+git$RENODE_SHA"

if [ ! -d "renode-portable" ]; then
	mkdir renode-portable
else
	rm -rf renode-portable/*
fi

BINARY_DOWNLOAD_URL="https://builds.renode.io/sha/$RENODE_BUILD.linux-portable.tar.gz"

if [[ "$ARCH" == "arm64" ]]; then
	if [[ "$OS" == "darwin" ]]; then
		BINARY_DOWNLOAD_URL="https://builds.renode.io/sha/$RENODE_BUILD.osx-arm64-portable.dmg"
	else
		BINARY_DOWNLOAD_URL="https://builds.renode.io/sha/$RENODE_BUILD.linux-arm64-portable.tar.gz"
	fi
fi

echo "Downloading $RENODE_BUILD..."
wget -q "$BINARY_DOWNLOAD_URL"

echo "Unpacking Renode binary..."
tar -xf "$RENODE_BUILD".*.tar.gz -C renode-portable --strip-components=1
echo "Run 'export PATH=\"\$PATH:`pwd`/renode-portable\"' to add Renode to your PATH"
rm "$RENODE_BUILD".*.tar.gz

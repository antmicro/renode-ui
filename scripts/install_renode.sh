#!/usr/bin/env bash
set -e

MAIN_DIR=$(realpath $(dirname $(dirname "$0")))
cd $MAIN_DIR

ARCH="$(uname -m)"
OS="$OSTYPE"

if [ ! -d "renode-portable" ]; then
	mkdir renode-portable
else
	rm -rf renode-portable/*
fi

BINARY_DOWNLOAD_URL="https://builds.renode.io/renode-latest.linux-portable-dotnet.tar.gz"

if [[ "$ARCH" == "arm64" ]]; then
	if [[ "$OS" == "darwin" ]]; then
		BINARY_DOWNLOAD_URL="https://builds.renode.io/renode-latest.osx-arm64-portable.dmg"
	else
		BINARY_DOWNLOAD_URL="https://builds.renode.io/renode-latest.linux-arm64-portable-dotnet.tar.gz"
	fi
fi

echo "Downloading Renode binary..."
wget -q "$BINARY_DOWNLOAD_URL"

echo "Unpacking Renode binary..."
tar -xf renode-latest.*.tar.gz -C renode-portable --strip-components=1
echo "Run 'export PATH=\"\$PATH:`pwd`/renode-portable\"' to add Renode to your PATH"
rm renode-latest.*.tar.gz

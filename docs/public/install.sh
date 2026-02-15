#!/bin/sh

# Docia Install Script
# Usage: curl -fsSL https://docia.xyz/install.sh | sh

set -e

REPO="docia/docia"
BIN_NAME="docia"

# Detect OS (Windows not supported via install script)
OS=$(uname -s)
case "$OS" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=darwin;;
    *)          echo "Unsupported OS: $OS"; echo "Please download manually from https://github.com/${REPO}/releases"; exit 1;;
esac

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64)   ARCH=x64;;
    arm64|aarch64)  ARCH=arm64;;
    *)              echo "Unsupported architecture: $ARCH"; exit 1;;
esac

EXT="tar.gz"

VERSION=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
    echo "Failed to fetch latest version"
    exit 1
fi

ASSET_NAME="docia-${VERSION}-${PLATFORM}-${ARCH}.${EXT}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET_NAME}"

echo "Installing Docia ${VERSION} for ${PLATFORM}-${ARCH}..."
echo "Downloading from ${DOWNLOAD_URL}..."

# Create temp directory
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Download and extract
cd "$TMP_DIR"
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o "$ASSET_NAME"
else
    wget -q "$DOWNLOAD_URL" -O "$ASSET_NAME"
fi

if [ "$EXT" = "zip" ]; then
    unzip -q "$ASSET_NAME"
else
    tar -xzf "$ASSET_NAME"
fi

# Find the binary
EXTRACTED_BIN="docia-${VERSION}-${PLATFORM}-${ARCH}"
if [ "$PLATFORM" = "windows" ]; then
    EXTRACTED_BIN="${EXTRACTED_BIN}.exe"
fi

# Move to install location
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
    echo "Need sudo access to install to $INSTALL_DIR"
    sudo mv "$EXTRACTED_BIN" "$INSTALL_DIR/$BIN_NAME"
    sudo chmod +x "$INSTALL_DIR/$BIN_NAME"
else
    mv "$EXTRACTED_BIN" "$INSTALL_DIR/$BIN_NAME"
    chmod +x "$INSTALL_DIR/$BIN_NAME"
fi

echo ""
echo "✓ Docia ${VERSION} installed successfully!"
echo "  Location: $(which $BIN_NAME)"
echo ""
echo "Run 'docia --help' to get started"

#!/bin/sh

# Docia Install Script
# Usage: curl -fsSL https://docia.xyz/install.sh | sh

set -e

REPO="torstendittmann/docia"
BIN_NAME="docia"

if command -v curl >/dev/null 2>&1; then
    download() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
    download() { wget -q "$1" -O "$2"; }
else
    echo "Neither curl nor wget is installed"
    exit 1
fi

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

# Create temp directory
TMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT HUP INT TERM

download "https://api.github.com/repos/${REPO}/releases/latest" "$TMP_DIR/release.json"
VERSION=$(grep '"tag_name":' "$TMP_DIR/release.json" | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
    echo "Failed to fetch latest version"
    exit 1
fi

ASSET_NAME="docia-v${VERSION}-${PLATFORM}-${ARCH}.${EXT}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET_NAME}"
CHECKSUM_URL="https://github.com/${REPO}/releases/download/${VERSION}/SHA256SUMS"

echo "Installing Docia ${VERSION} for ${PLATFORM}-${ARCH}..."
echo "Downloading from ${DOWNLOAD_URL}..."

# Download and extract
cd "$TMP_DIR"
download "$DOWNLOAD_URL" "$ASSET_NAME"
if download "$CHECKSUM_URL" "SHA256SUMS"; then
    EXPECTED_CHECKSUM=$(awk -v name="$ASSET_NAME" '$2 == name { print $1 }' SHA256SUMS)
    if [ -z "$EXPECTED_CHECKSUM" ]; then
        echo "Could not find a checksum for ${ASSET_NAME}"
        exit 1
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_CHECKSUM=$(sha256sum "$ASSET_NAME" | awk '{ print $1 }')
    elif command -v shasum >/dev/null 2>&1; then
        ACTUAL_CHECKSUM=$(shasum -a 256 "$ASSET_NAME" | awk '{ print $1 }')
    else
        echo "No SHA-256 checksum tool is available"
        exit 1
    fi

    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
        echo "Checksum verification failed for ${ASSET_NAME}"
        exit 1
    fi

    echo "Checksum verified."
else
	case "$VERSION" in
	    0.*) echo "Warning: this legacy release does not provide SHA256SUMS." ;;
	    *) echo "This release does not provide the required SHA256SUMS file"; exit 1 ;;
	esac
fi

if [ "$EXT" = "zip" ]; then
    unzip -q "$ASSET_NAME"
else
    tar -xzf "$ASSET_NAME"
fi

# Find the binary
EXTRACTED_BIN="docia-v${VERSION}-${PLATFORM}-${ARCH}"
if [ "$PLATFORM" = "windows" ]; then
    EXTRACTED_BIN="${EXTRACTED_BIN}.exe"
fi

# Move to install location
INSTALL_DIR=${DOCIA_INSTALL_DIR:-/usr/local/bin}
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR" 2>/dev/null || sudo mkdir -p "$INSTALL_DIR"
fi
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

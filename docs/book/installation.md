# Installation

## Option 1: Standalone Executable (Recommended)

Download and install Docia without any dependencies. Works on macOS and Linux.

### One-line installer

```bash
curl -fsSL https://docia.xyz/install.sh | sh
```

This script automatically detects your platform and architecture, downloads the latest release, and installs it to `/usr/local/bin/`.

### Manual installation

If you prefer to install manually, download the appropriate binary from [GitHub Releases](https://github.com/docia/docia/releases/latest):

**macOS (Apple Silicon)**

```bash
curl -L https://github.com/docia/docia/releases/latest/download/docia-v$(curl -s https://api.github.com/repos/docia/docia/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')-darwin-arm64.tar.gz | tar xz
sudo mv docia-v* /usr/local/bin/docia
```

**macOS (Intel)**

```bash
curl -L https://github.com/docia/docia/releases/latest/download/docia-v$(curl -s https://api.github.com/repos/docia/docia/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')-darwin-x64.tar.gz | tar xz
sudo mv docia-v* /usr/local/bin/docia
```

**Linux (x64)**

```bash
curl -L https://github.com/docia/docia/releases/latest/download/docia-v$(curl -s https://api.github.com/repos/docia/docia/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')-linux-x64.tar.gz | tar xz
sudo mv docia-v* /usr/local/bin/docia
```

**Linux (ARM64)**

```bash
curl -L https://github.com/docia/docia/releases/latest/download/docia-v$(curl -s https://api.github.com/repos/docia/docia/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')-linux-arm64.tar.gz | tar xz
sudo mv docia-v* /usr/local/bin/docia
```

### Windows

Windows users should download the `.exe` from [GitHub Releases](https://github.com/docia/docia/releases/latest) and add it to their PATH manually.

## Option 2: npm (requires Bun)

If you prefer to use npm/Bun:

**Prerequisites:** Bun 1.3+

```bash
# Install globally
bun install -g docia

# Or use with bunx (no install needed)
bunx docia --help
```

## Verify installation

```bash
docia --version
```

## Create your first docs project

```bash
docia init my-docs
cd my-docs
docia dev
```

Your documentation site will be available at `http://localhost:3000`.

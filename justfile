# Plan Viewer - Justfile
# Cross-platform command runner (requires: https://just.systems)
# Install: 
#   Windows: winget install just
#   macOS:   brew install just
#   Linux:   cargo install just

# Default recipe - show help
default:
    @just --list

# Start the Plan Viewer server
start:
    @echo "🚀 Starting Plan Viewer server..."
    @python server.py --port 3456

# Run setup (install hooks, create directories, start server)
setup:
    @echo "📋 Running Plan Viewer setup..."
    @python setup.py

# Uninstall hooks
uninstall:
    @echo "🗑️  Uninstalling Plan Viewer hooks..."
    @python uninstall.py

# Open browser
open:
    @echo "🌐 Opening Plan Viewer in browser..."
    @python -c "import webbrowser; webbrowser.open('http://localhost:3456')"

# Quick start - start server in background and open browser
go:
    @echo "🚀 Quick start Plan Viewer..."
    @python -c "import subprocess, webbrowser, time; subprocess.Popen(['python', 'server.py', '--port', '3456']); time.sleep(2); webbrowser.open('http://localhost:3456')"

# Check Python version
check:
    @echo "🐍 Checking Python..."
    @python --version

# List all recipes
list:
    @just --list

#!/usr/bin/env python3
"""
Plan Viewer - Setup Helper (Cross-platform)
Wraps setup.bat (Windows) or setup.sh (Unix)
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    
    if sys.platform == 'win32':
        # Windows - use setup.bat
        setup_script = script_dir / "setup.bat"
        if setup_script.exists():
            subprocess.run([str(setup_script)] + sys.argv[1:])
        else:
            print("❌ setup.bat not found!")
            sys.exit(1)
    else:
        # Unix - use setup.sh
        setup_script = script_dir / "setup.sh"
        if setup_script.exists():
            os.chmod(setup_script, 0o755)
            subprocess.run(["bash", str(setup_script)] + sys.argv[1:])
        else:
            print("❌ setup.sh not found!")
            sys.exit(1)

if __name__ == "__main__":
    main()

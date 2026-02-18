#!/usr/bin/env python3
"""
Plan Viewer - Uninstall Helper (Cross-platform)
Wraps uninstall.bat (Windows) or setup.sh --uninstall (Unix)
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    
    if sys.platform == 'win32':
        # Windows - use uninstall.bat
        uninstall_script = script_dir / "uninstall.bat"
        if uninstall_script.exists():
            subprocess.run([str(uninstall_script)])
        else:
            print("❌ uninstall.bat not found!")
            sys.exit(1)
    else:
        # Unix - use setup.sh --uninstall
        setup_script = script_dir / "setup.sh"
        if setup_script.exists():
            os.chmod(setup_script, 0o755)
            subprocess.run(["bash", str(setup_script), "--uninstall"])
        else:
            print("❌ setup.sh not found!")
            sys.exit(1)

if __name__ == "__main__":
    main()

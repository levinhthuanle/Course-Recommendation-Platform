import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Force the test environment away from PostgreSQL-backed runtime settings.
os.environ["DATABASE_URL"] = ""

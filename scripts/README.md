# Running the LabCAS Selenium checks

1. Create a virtual environment and install the dependency:
   `python3 -m venv .venv && source .venv/bin/activate && pip install -r scripts/requirements.txt`.
2. Save credentials in `~/.env` as `export LABCAS_USERNAME="your-username"` and
   `export LABCAS_PASSWORD="your-password"`, then protect it with `chmod 600 ~/.env`.
3. Load the credentials before each run with `source ~/.env`.
4. Run the comprehensive checks with
   `python3 scripts/selenium_labcas_comprehensive.py --base-url https://labcas-dev.jpl.nasa.gov --headed`.
5. To capture output for review, append
   `2>&1 | tee selenium-$(date +%Y%m%d-%H%M%S).log`; run
   `python3 scripts/selenium_labcas_smoke.py` for the shorter smoke test.

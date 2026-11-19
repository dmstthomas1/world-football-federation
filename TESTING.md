# WFF automated testing

The GitHub Actions workflow **WFF Browser Tests** runs Chromium browser checks on every push and pull request. It can also be started manually from GitHub → Actions → WFF Browser Tests → Run workflow.

## Local execution

Install Node.js 22+ and Python 3, then run:

```bash
npm install
npx playwright install chromium
npm test
```

Playwright starts a local static web server on port 8765. Tests use a fresh browser context, so they do not modify your existing WFF franchise saved in your regular browser.

## Current coverage

- Web page loads without uncaught JavaScript exceptions
- Halftime countdown survives the ordinary game scheduler
- No premature transition before 15 seconds
- Exactly one automatic transition at 15 seconds
- Halftime presentation shows two teams and at most three featured players each

On failure, the workflow uploads Playwright traces, screenshots and an HTML report as a downloadable Actions artifact.

**Limitations:** These tests do not yet simulate an entire game from kickoff through halftime, verify audio timing, or assess realistic football decisions. A passing test run should not be interpreted as proof that all WFF gameplay is correct.

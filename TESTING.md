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
- Offensive and defensive timeouts, the two-minute warning, and victory-formation decisions
- Stationary red and white markers and one result line per play
- Sack attribution follows the active quarterback in the depth chart
- Scoring and turnover cards render above the result line

On failure, the workflow uploads Playwright traces, screenshots and an HTML report as a downloadable Actions artifact.

**Limitations:** These tests exercise specific situations. They do not measure the statistical realism of decisions over a season. A passing test run should not be interpreted as proof that all WFF gameplay is correct.

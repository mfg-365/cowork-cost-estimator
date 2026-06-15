# Microsoft Copilot Cowork — Usage-Based Cost Estimator

A live, browser-based estimator that lets a customer model their expected **Copilot Credit** usage and **Cowork budget** by entering their own assumptions. Built as a static site for GitHub Pages — no backend required.

## Features

- **Live form** — totals recalculate instantly as you type.
- **Four-step model** mirroring the source `CustomerCoworkEstimator` workbook:
  1. **Who will use Cowork?** — user counts across four roles.
  2. **Prompts per user / month** — light / medium / heavy volumes per role (per-user credit spend computed live).
  3. **Credits per prompt** — editable assumptions (defaults: Light 125, Medium 500, Heavy 2,500).
  4. **Summary** — monthly credits, monthly & annual budget, average price per user, and a per-role breakdown.
- **Print** — clean print stylesheet for a one-click hard copy.
- **Export to PDF** — generates a crisp, text-based PDF report of the estimate (via [jsPDF](https://github.com/parallax/jsPDF)).
- Context panels summarising the four cost inputs (Models, Context, Tools, Runtime), job types, and pricing examples.

## The calculation

```
perUserCredits  = light × creditsPerLight
                + medium × creditsPerMedium
                + heavy × creditsPerHeavy

monthlyCredits  = Σ (users_role × perUserCredits_role)
monthlyBudget$  = monthlyCredits ÷ 100        // 1 Credit = $0.01 (PAYG list price)
avgPerUser$     = monthlyBudget ÷ totalUsers
```

### Default assumptions

| Role | Light | Medium | Heavy |
| --- | --- | --- | --- |
| Corporate Knowledge Workers | 22 | 11 | 5 |
| Customer-Facing Knowledge Workers | 17 | 13 | 5 |
| Technical Workers | 12 | 9 | 14 |
| Managers & Senior Leaders | 13 | 6 | 3 |

Defaults reflect Microsoft Frontier customer usage as of 5/27/2026 and are fully editable.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8080
# then visit http://localhost:8080
```

## Deploy (GitHub Pages)

The site is plain HTML/CSS/JS at the repository root. In **Settings → Pages**, set the source to the `main` branch / root. The site publishes at `https://<user>.github.io/<repo>/`.

## Disclaimer

Figures are derived from aggregated, anonymized data from customers in the Cowork Frontier program and are provided for illustrative purposes only. They may not reflect the experience of all customers and should not be relied upon as definitive, complete, or predictive of future outcomes. Microsoft does not guarantee accuracy and disclaims any warranties related to expected results. List pricing, USD.

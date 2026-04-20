# Contributing Guidelines

Thank you for your interest in contributing to **WoodworkingShop**!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person

## Development Setup

### Prerequisites

- Python 3.11 or higher
- Git
- VS Code (recommended)

### Setup Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/RajwanYair/WoodworkingShop.git
   cd WoodworkingShop
   ```

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Generate all 12 PDFs:

   ```bash
   python pantry-cabinet-plans/plan-a/generate_plan_a_pdfs.py
   python pantry-cabinet-plans/plan-b/generate_plan_b_pdfs.py
   python pantry-cabinet-plans/plan-c/generate_plan_c_pdfs.py
   python pantry-cabinet-plans/generate_unified_optimized_plans.py
   ```

## Coding Standards

### Python Style

- Follow PEP 8 with 100-character line limit
- Use type hints for all functions
- Use `ruff format` for formatting
- Use `ruff check` for linting

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` restructuring without behaviour change
- `ci:` CI/CD changes
- `chore:` maintenance tasks

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all 12 PDFs generate without errors
4. Open a PR — the CI workflow will verify the build automatically

## Architecture Notes

- **`pantry-cabinet-plans/shared/pdf_utils.py`** — shared rendering library used by all generators
- Each plan (`plan-a`, `plan-b`, `plan-c`) has its own generator and markdown
- The unified generator aggregates all plans into a comparison document
- SVG assets are hand-authored; PDFs are generated and not committed

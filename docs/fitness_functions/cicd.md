# CI/CD Integration

Integrate fitness function validation into your build pipeline to catch architectural violations early.

## GitHub Actions

```yaml
name: Architecture Validation

on: [ push, pull_request ]

jobs:
  fitness-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Charon
        run: |
          cd backend
          pip install uv
          uv sync --frozen

      - name: Analyze codebase
        run: |
          curl -X POST http://localhost:8000/api/analyze \
            -H "Content-Type: application/json" \
            -d '{"source": "local", "files": [...]}' \
            > analysis_result.json

      - name: Validate fitness functions
        run: |
          cd backend
          python -m app.cli.fitness_check \
            --rules ../.charon/fitness_rules.yaml \
            --graph ../analysis_result.json \
            --fail-on-error \
            --save-history \
            --project-name ${{ github.repository }}
```

## GitLab CI

```yaml
fitness-check:
  stage: test
  image: ghcr.io/astral-sh/uv:python3.12-bookworm-slim
  script:
    - cd backend
    - uv sync --frozen
    - uv run python -m app.cli.fitness_check
      --rules ../.charon/fitness_rules.yaml
      --graph ../analysis_result.json
      --fail-on-error
      --save-history
      --project-name $CI_PROJECT_NAME
  artifacts:
    when: always
    paths:
      - validation_result.json
```

## Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Fitness Check') {
            steps {
                sh '''
                    cd backend
                    uv sync --frozen
                    uv run python -m app.cli.fitness_check \
                        --rules ../.charon/fitness_rules.yaml \
                        --graph ../analysis_result.json \
                        --fail-on-error \
                        --save-history \
                        --project-name ${JOB_NAME}
                '''
            }
        }
    }
}
```

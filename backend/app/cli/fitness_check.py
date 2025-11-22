#!/usr/bin/env python3
"""CLI tool for architectural fitness function validation.

This tool can be integrated into CI/CD pipelines to enforce architectural rules.

Usage:
    python -m app.cli.fitness_check --rules fitness_rules.json --graph graph_data.json [options]

Example:
    python -m app.cli.fitness_check \
        --rules .charon/fitness_rules.json \
        --graph analysis_result.json \
        --fail-on-error \
        --fail-on-warning \
        --save-history \
        --project-name my-project

Exit codes:
    0 - All rules passed
    1 - Rule violations found (based on fail-on-* flags)
    2 - Error running validation (configuration or execution error)
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional
import yaml

from app.core.models import (
    FitnessRuleConfig,
    FitnessValidationRequest,
    DependencyGraph,
    GlobalMetrics,
    AnalysisResult,
)
from app.services.fitness_service import FitnessService


class Colors:
    """ANSI color codes for terminal output."""

    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def load_rules(rules_path: str) -> FitnessRuleConfig:
    """Load fitness rules from a JSON or YAML file."""
    path = Path(rules_path)
    if not path.exists():
        print(f"{Colors.RED}Error: Rules file not found: {rules_path}{Colors.RESET}")
        sys.exit(2)

    with open(path, "r") as f:
        if path.suffix in [".yaml", ".yml"]:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)

    return FitnessRuleConfig(**data)


def load_graph_data(graph_path: str) -> tuple[DependencyGraph, GlobalMetrics]:
    """Load dependency graph data from a JSON file."""
    path = Path(graph_path)
    if not path.exists():
        print(f"{Colors.RED}Error: Graph data file not found: {graph_path}{Colors.RESET}")
        sys.exit(2)

    with open(path, "r") as f:
        data = json.load(f)

    # Handle both AnalysisResult format and raw graph format
    if "graph" in data and "global_metrics" in data:
        analysis = AnalysisResult(**data)
        return analysis.graph, analysis.global_metrics
    else:
        # Assume it's raw format
        graph = DependencyGraph(**data["graph"])
        metrics = GlobalMetrics(**data["global_metrics"])
        return graph, metrics


def print_violation(violation, index: int, total: int):
    """Print a single violation with formatting."""
    severity_colors = {
        "error": Colors.RED,
        "warning": Colors.YELLOW,
        "info": Colors.CYAN,
    }
    color = severity_colors.get(violation.severity, Colors.RESET)

    print(f"\n{Colors.BOLD}[{index}/{total}] {violation.severity.upper()}: {violation.rule_name}{Colors.RESET}")
    print(f"{color}{violation.message}{Colors.RESET}")

    if violation.affected_modules:
        print(f"  Affected modules: {', '.join(violation.affected_modules[:5])}")
        if len(violation.affected_modules) > 5:
            print(f"    ... and {len(violation.affected_modules) - 5} more")

    if violation.details:
        print(f"  Details:")
        for key, value in violation.details.items():
            if isinstance(value, (list, dict)) and len(str(value)) > 100:
                print(f"    {key}: <complex value>")
            else:
                print(f"    {key}: {value}")


def save_result_to_file(result, output_path: str):
    """Save validation result to a file."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w") as f:
        json.dump(result.model_dump(), f, indent=2)

    print(f"\n{Colors.GREEN}Result saved to: {output_path}{Colors.RESET}")


def save_to_history(result, project_name: str, storage_path: str):
    """Save result to historical tracking file."""
    project_dir = Path(storage_path) / project_name
    project_dir.mkdir(parents=True, exist_ok=True)

    history_file = project_dir / "fitness_history.jsonl"

    with open(history_file, "a") as f:
        f.write(json.dumps(result.model_dump()) + "\n")

    print(f"{Colors.GREEN}Result saved to history: {history_file}{Colors.RESET}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Architectural Fitness Function Validator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic validation
  python -m app.cli.fitness_check --rules rules.json --graph graph.json

  # Fail on errors only
  python -m app.cli.fitness_check --rules rules.json --graph graph.json --fail-on-error

  # Fail on warnings too
  python -m app.cli.fitness_check --rules rules.json --graph graph.json --fail-on-error --fail-on-warning

  # Save results and history
  python -m app.cli.fitness_check --rules rules.json --graph graph.json \\
      --save-history --project-name my-project --output result.json

Exit Codes:
  0 = All rules passed
  1 = Rule violations found
  2 = Execution error
        """,
    )

    parser.add_argument(
        "--rules",
        "-r",
        required=True,
        help="Path to fitness rules configuration file (JSON or YAML)",
    )
    parser.add_argument(
        "--graph",
        "-g",
        required=True,
        help="Path to dependency graph data file (JSON)",
    )
    parser.add_argument(
        "--fail-on-error",
        action="store_true",
        help="Exit with code 1 if any error-level violations are found",
    )
    parser.add_argument(
        "--fail-on-warning",
        action="store_true",
        help="Exit with code 1 if any warning-level violations are found",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Save validation result to this file (JSON)",
    )
    parser.add_argument(
        "--save-history",
        action="store_true",
        help="Save result to historical tracking",
    )
    parser.add_argument(
        "--project-name",
        "-p",
        default="default",
        help="Project name for historical tracking (default: default)",
    )
    parser.add_argument(
        "--storage-path",
        default=".charon_fitness",
        help="Storage path for historical data (default: .charon_fitness)",
    )
    parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="Suppress detailed output, only show summary",
    )
    parser.add_argument(
        "--json-output",
        action="store_true",
        help="Output results as JSON (useful for parsing in scripts)",
    )

    args = parser.parse_args()

    try:
        # Load configuration
        if not args.quiet:
            print(f"{Colors.BOLD}Loading fitness rules from: {args.rules}{Colors.RESET}")
        rules_config = load_rules(args.rules)

        if not args.quiet:
            print(f"{Colors.BOLD}Loading dependency graph from: {args.graph}{Colors.RESET}")
        graph, metrics = load_graph_data(args.graph)

        enabled_rules = [r for r in rules_config.rules if r.enabled]
        if not args.quiet:
            print(f"{Colors.BOLD}Found {len(enabled_rules)} enabled rules{Colors.RESET}\n")

        # Run validation
        service = FitnessService(graph, metrics)
        result = service.validate_rules(
            rules=rules_config.rules,
            fail_on_error=args.fail_on_error,
            fail_on_warning=args.fail_on_warning,
        )

        # Output results
        if args.json_output:
            print(json.dumps(result.model_dump(), indent=2))
        else:
            # Print summary
            print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
            print(f"{Colors.BOLD}VALIDATION SUMMARY{Colors.RESET}")
            print(f"{Colors.BOLD}{'='*70}{Colors.RESET}")
            print(f"Status: {Colors.GREEN if result.passed else Colors.RED}{result.summary}{Colors.RESET}")
            print(f"Total Rules Evaluated: {result.total_rules}")
            print(f"Violations Found: {len(result.violations)}")
            if result.errors > 0:
                print(f"  {Colors.RED}Errors: {result.errors}{Colors.RESET}")
            if result.warnings > 0:
                print(f"  {Colors.YELLOW}Warnings: {result.warnings}{Colors.RESET}")
            if result.infos > 0:
                print(f"  {Colors.CYAN}Info: {result.infos}{Colors.RESET}")

            # Print violations
            if result.violations and not args.quiet:
                print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
                print(f"{Colors.BOLD}VIOLATIONS{Colors.RESET}")
                print(f"{Colors.BOLD}{'='*70}{Colors.RESET}")

                for i, violation in enumerate(result.violations, 1):
                    print_violation(violation, i, len(result.violations))

            print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")

        # Save output if requested
        if args.output:
            save_result_to_file(result, args.output)

        # Save to history if requested
        if args.save_history:
            save_to_history(result, args.project_name, args.storage_path)

        # Exit with appropriate code
        if not result.passed:
            if not args.quiet:
                print(f"\n{Colors.RED}Validation FAILED - Exiting with code 1{Colors.RESET}")
            sys.exit(1)
        else:
            if not args.quiet:
                print(f"\n{Colors.GREEN}Validation PASSED - All rules satisfied{Colors.RESET}")
            sys.exit(0)

    except Exception as e:
        print(f"\n{Colors.RED}Error running validation: {str(e)}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(2)


if __name__ == "__main__":
    main()

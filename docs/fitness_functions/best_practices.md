# Best Practices

## Getting Started

1. **Start simple**: Begin with a few critical rules (no circular deps, max coupling)
2. **Gradual adoption**: Add rules incrementally to avoid overwhelming the team
3. **Warnings first**: Start with `warning` severity, promote to `error` later
4. **Document context**: Add descriptions explaining why each rule exists
5. **Version control**: Keep rules alongside code
6. **Review regularly**: Update rules as architecture evolves
7. **Team buy-in**: Make sure everyone understands and agrees on the rules
8. **Monitor trends**: Use historical tracking to spot architectural drift

## Troubleshooting

### Rule Not Triggering

- Check `enabled: true` is set
- Verify regex patterns match your module structure
- Test patterns with a regex tool
- Check parameters are correct for the rule type

### CLI Tool Not Found

```bash
# Make sure you're in the backend directory
cd backend

# And Python can find the app module
export PYTHONPATH="${PYTHONPATH}:."
```

### Graph Data Format

Graph data must be in the format produced by Charon's analysis endpoint. Either:

1. Use the analysis result directly from `/api/analyze`
2. Or use exported data from `/api/export`

## FAQ

**Can I use custom rule types?**
Not yet. You can combine existing rules creatively. Custom rule types may come in future versions.

**How do I disable a rule temporarily?**
Set `enabled: false` in the rule config.

**Can rules be project-specific?**
Yes. Use `module_pattern` to target specific parts of your codebase.

**What's the performance impact?**
Minimal. Fitness checks run in seconds even for large codebases since they analyze the pre-computed dependency graph.

**Can I export rules from the web UI?**
Currently rules are managed via config files. UI support may come later.

## Contributing

Have ideas for new rule types or improvements? [Open an issue](https://github.com/HardMax71/charon/issues)
or [send a PR](https://github.com/HardMax71/charon/pulls).

## References

- [Building Evolutionary Architectures](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/)
  by Neal Ford, Rebecca Parsons, and Patrick Kua
- [Fitness Function-Driven Development](https://www.thoughtworks.com/insights/articles/fitness-function-driven-development)
  on ThoughtWorks
- [ArchUnit](https://www.archunit.org/) (Java architecture testing library that inspired some of this)

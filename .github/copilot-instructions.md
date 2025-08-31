# CapCop Repository Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

CapCop is a repository under the AnywhereAiOps organization. Currently, this repository is in its initial state containing only licensing information.

## Working Effectively

### Current Repository State
- Repository contains only a LICENSE file (Apache License 2.0)
- No source code, build files, or documentation has been added yet
- Clone the repository using: `git clone https://github.com/AnywhereAiOps/CapCop.git`

### Available Development Environment
The following tools are available in the development environment:
- **Git**: `git version 2.51.0` - Use `git --no-pager <command>` to avoid pagination timeouts
- **Node.js**: `v20.19.4` - Available for JavaScript/TypeScript development
- **Python**: `Python 3.12.3` - Available for Python development  
- **Docker**: `Docker version 28.0.4` - Available for containerization
- **Make**: `GNU Make 4.3` - Available for build automation

### Repository Setup Commands
Since the repository is minimal, these commands establish the basic working environment:
- `cd /path/to/CapCop` - Navigate to repository root
- `git status` - Always check repository status first
- `git --no-pager log --oneline -5` - View recent commits without pagination

### Future Development Preparation
When source code is added to this repository, update these instructions with:

#### For Node.js/JavaScript Projects:
- `npm install` - Install dependencies (timeout: 5+ minutes)
- `npm run build` - Build the project (timeout: 15+ minutes) 
- `npm test` - Run tests (timeout: 10+ minutes)
- `npm run lint` - Run linting (timeout: 3+ minutes)

#### For Python Projects:
- `pip install -r requirements.txt` - Install dependencies (timeout: 10+ minutes)
- `python -m pytest` - Run tests (timeout: 15+ minutes)
- `python -m flake8` - Run linting (timeout: 2+ minutes)

#### For Docker Projects:
- `docker build -t capcop .` - Build container (timeout: 30+ minutes) 
- `docker run capcop` - Run container (timeout: varies)

**CRITICAL: NEVER CANCEL long-running commands. Builds may take 30+ minutes. Always set appropriate timeouts and wait for completion.**

## Validation Requirements

### Before Making Changes
- Run `git status` to check current state
- Check `git --no-pager diff` for any uncommitted changes
- Ensure you understand the current repository structure

### After Making Changes  
- **ALWAYS** run `git --no-pager diff` to review changes
- **ALWAYS** validate that any build/test commands work before documenting them
- If the repository gains a CI/CD pipeline (.github/workflows/), ensure your changes don't break it
- Test any new functionality thoroughly - do not just start and stop applications

### Manual Testing Requirements
When the repository gains functionality:
- **ALWAYS** exercise complete user workflows after making changes
- Take screenshots of any UI changes if applicable
- Test CLI commands with actual inputs and verify outputs
- Validate all documented commands work exactly as written

## Common Tasks

### Repository Structure
```
ls -la
total 24
drwxr-xr-x 3 runner docker  4096 Aug 31 14:40 .
drwxr-xr-x 3 runner docker  4096 Aug 31 14:39 ..
drwxr-xr-x 7 runner docker  4096 Aug 31 14:40 .git
-rw-r--r-- 1 runner docker 11095 Aug 31 14:40 LICENSE
```

### License Information
- Repository uses Apache License 2.0
- Copyright 2025 Valeriy Soloviov
- Full license text available in `LICENSE` file

## Important Notes

- **TIMEOUT WARNINGS**: All build and test commands must include appropriate timeout values
- **NO CANCELLATION**: Never cancel builds or long-running operations prematurely  
- **VALIDATION FIRST**: Always test commands before adding them to any documentation
- **MINIMAL CHANGES**: Make the smallest possible changes to achieve your goals
- **IMPERATIVE TONE**: All instructions should be written as direct commands

## Key Principles for Development

1. **Always validate** - Every command must be tested before being documented
2. **Set proper timeouts** - Build: 30+ minutes, Tests: 15+ minutes, Install: 10+ minutes
3. **Never cancel operations** - Wait for completion even if it takes longer than expected
4. **Test thoroughly** - Exercise real user scenarios, not just start/stop operations
5. **Document timing** - Include expected duration for all time-consuming operations

When this repository evolves and gains actual functionality, these instructions must be updated with:
- Specific build commands and their actual measured timing
- Test execution procedures and expected duration  
- Development workflow steps
- Key files and directories to know about
- Common debugging and troubleshooting steps
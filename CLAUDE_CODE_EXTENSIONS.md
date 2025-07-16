# Claude Code Extensions Guide

This guide covers two essential extensions for Claude Code that enhance productivity and project management.

## 1. ccusage - Token Usage and Cost Analytics

### Overview
**ccusage** is a CLI tool for analyzing Claude Code token usage and costs from local JSONL files. It provides fast and informative insights into your AI usage patterns.

### Installation

#### Quick Start (Recommended)
```bash
# Run directly without installation
bunx ccusage
# or
npx ccusage@latest
```

#### Global Installation (Optional)
```bash
npm install -g ccusage
```

### Key Features
- 📊 Daily, monthly, and session-based usage reports
- 📈 Live monitoring of token usage
- 🤖 Model tracking (Opus, Sonnet)
- 💰 Cost tracking in USD
- 📅 Date range filtering
- 📄 JSON output option
- 🔌 Offline mode support
- 📱 Compact terminal display
- 🚀 Ultra-small bundle size

### Usage Examples

#### Basic Usage
```bash
ccusage          # Default daily report
ccusage daily    # Daily token usage
ccusage monthly  # Monthly aggregated report
```

#### Advanced Usage
```bash
ccusage blocks --live      # Real-time usage dashboard
ccusage --since 2024-01-01 --until 2024-01-31  # Date range filtering
ccusage --json             # JSON output format
ccusage --breakdown        # Per-model cost details
ccusage --offline          # Offline mode
```

### Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `--since` | Start date for filtering | `--since 2024-01-01` |
| `--until` | End date for filtering | `--until 2024-01-31` |
| `--json` | Output in JSON format | `--json` |
| `--breakdown` | Show per-model cost details | `--breakdown` |
| `--offline` | Run in offline mode | `--offline` |
| `--live` | Real-time monitoring | `--live` |

### Sample Output
```
📊 Daily Usage Report - 2024-01-15
┌─────────────────────────────────────────────────────┐
│ Model: Claude-3.5-Sonnet                           │
│ Tokens: 15,432 input / 8,234 output               │
│ Cost: $0.23 USD                                    │
│ Sessions: 5                                        │
└─────────────────────────────────────────────────────┘
```

### Documentation
Full documentation is available at [ccusage.com](https://ccusage.com)

---

## 2. ccundo - Intelligent Undo/Redo for Claude Code

### Overview
**ccundo** provides intelligent undo/redo functionality for Claude Code sessions, allowing you to selectively revert file operations while maintaining project consistency.

### Installation
```bash
npm install -g ccundo
```

### Key Features
- 🔄 Automatic detection of Claude Code session files
- 👁️ Detailed change previews
- 🔗 Cascading undo/redo that maintains project consistency
- 🌐 Multi-language support (English, Japanese, French, Spanish, German)
- 📁 Tracks file edits, creations, deletions, renames, and bash commands
- 💾 Creates safe backups before changes

### Basic Commands

#### List Operations
```bash
ccundo list    # View recent operations
```

#### Preview Changes
```bash
ccundo preview # See what would be undone
```

#### Undo Operations
```bash
ccundo undo    # Revert operations
ccundo undo 3  # Undo last 3 operations
```

#### Redo Operations
```bash
ccundo redo    # Restore previously undone operations
ccundo redo 2  # Redo last 2 undone operations
```

### Advanced Usage

#### Interactive Mode
```bash
ccundo --interactive  # Interactive selection of operations to undo
```

#### Specific File Operations
```bash
ccundo list --file src/components/Button.tsx  # List operations for specific file
ccundo undo --file src/components/Button.tsx  # Undo operations for specific file
```

### Configuration
- Configuration stored in `~/.ccundo/`
- Configurable language preferences
- Customizable backup locations

### How It Works
1. **File Tracking**: Parses `.jsonl` files in `~/.claude/projects/`
2. **Operation Analysis**: Tracks dependencies between operations
3. **Safe Changes**: Creates backups before any modifications
4. **Cascading Logic**: Ensures consistent project state after undo/redo

### Safety Features
- ✅ Automatic backups before changes
- ✅ Dependency tracking prevents inconsistent states
- ✅ Preview mode to see changes before applying
- ✅ Safe rollback if operations fail

### Example Workflow
```bash
# 1. Check what operations have been performed
ccundo list

# 2. Preview what would be undone
ccundo preview

# 3. Undo the last operation
ccundo undo

# 4. If needed, redo the operation
ccundo redo
```

---

## Best Practices

### Using ccusage Effectively
1. **Regular Monitoring**: Use `ccusage --live` during development sessions
2. **Cost Tracking**: Run monthly reports to monitor expenses
3. **Model Analysis**: Use `--breakdown` to understand model usage patterns
4. **Automation**: Integrate into CI/CD for usage reporting

### Using ccundo Safely
1. **Preview First**: Always use `ccundo preview` before undoing
2. **Backup Important Work**: Don't rely solely on ccundo for backups
3. **Test Changes**: Verify project state after undo/redo operations
4. **Small Steps**: Undo operations incrementally rather than in large batches

### Integration Tips
- Use ccusage to monitor token usage during development
- Use ccundo to safely experiment with Claude Code changes
- Combine both tools for comprehensive Claude Code session management
- Set up aliases for frequently used commands

---

## Troubleshooting

### ccusage Issues
- **No data found**: Ensure Claude Code has generated `.jsonl` files
- **Incorrect paths**: Check that ccusage is looking in the right directory
- **Permission errors**: Verify read permissions on Claude Code files

### ccundo Issues
- **Operation not found**: Ensure you're in the correct project directory
- **Backup failures**: Check disk space and write permissions
- **Dependency conflicts**: Use preview mode to understand operation relationships

---

## Conclusion

These extensions significantly enhance the Claude Code experience:
- **ccusage** provides essential insights into AI usage and costs
- **ccundo** offers safe experimentation with intelligent rollback capabilities

Together, they enable more efficient and confident development workflows with Claude Code.
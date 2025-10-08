# PAI Index Documentation Requirements

## Overview

The PAI Index system (`pai-index.md`) provides intelligent command discovery and metadata extraction. To maximize the benefits of indexing, searching, and analytics, commands should follow specific documentation patterns.

## Documentation Patterns

### Executable Commands (Hybrid Pattern - Recommended)

```markdown
#!/usr/bin/env bun
/**
 * # Command Name
 *
 * ## Purpose
 * Clear, single-line description of what this command does
 *
 * ## Description  
 * More detailed explanation of the command's functionality
 *
 * ## Usage
 * ```bash
 * # Basic usage
 * bun ${PAI_DIR}/commands/command-name.md
 * 
 * # With options
 * bun ${PAI_DIR}/commands/command-name.md --option value
 * ```
 *
 * ## Examples
 * ```bash
 * # Specific example
 * bun ${PAI_DIR}/commands/command-name.md --verbose
 * ```
 *
 * @tags automation, utility, analysis
 * @author Your Name
 * @created 2025-10-08
 */

// TypeScript code here
import { someModule } from 'some-package';
```

### Instructional Commands (Pure Markdown)

```markdown
# Command Name

## Purpose
Clear description of what this command accomplishes

## Description
Detailed explanation of the workflow and steps

## Usage
```bash
# How to use this command
echo "Example usage"
```

## Instructions
1. Step-by-step instructions
2. That the AI will follow
3. To execute this command

@tags instruction, workflow, manual
```

## Metadata Extraction Rules

The PAI Index system automatically extracts the following metadata:

### From JSDoc Comments (Executable Commands)
- **Purpose**: First line after `## Purpose` header
- **Description**: First line after `## Description` header  
- **Usage**: Code blocks within `## Usage` sections
- **Tags**: From `@tags` or `@tag` comments (comma or space separated)

### From Markdown Headers (Instructional Commands)
- **Purpose**: First line after `## Purpose` header
- **Description**: First line after `## Description` header
- **Tags**: From `@tags` or `@tag` comments anywhere in file

### Auto-Detected Metadata
- **Dependencies**: Parsed from `import` statements
- **File Type**: Based on extension and shebang presence
- **Health Status**: Calculated from structural compliance
- **Size & Timestamps**: From file system metadata

## Tagging Best Practices

### Recommended Tag Categories

#### Functional Tags
- `automation` - Automated processes
- `analysis` - Data analysis and reporting
- `utility` - General utility functions
- `integration` - External service integrations
- `workflow` - Multi-step processes

#### Domain Tags
- `finance` - Financial operations
- `development` - Development tools
- `communication` - Messaging and notifications
- `documentation` - Documentation generation
- `monitoring` - System monitoring

#### Technical Tags
- `typescript` - TypeScript implementations
- `shell` - Shell script commands
- `api` - API interactions
- `database` - Database operations
- `file-system` - File operations

### Tag Format
```markdown
@tags category1, category2, specific-function
```

## Benefits of Proper Documentation

### Enhanced Discoverability
- **Rich search results** with meaningful descriptions
- **Tag-based filtering** for logical command grouping
- **Usage examples** readily available for reference

### Quality Assurance
- **Health monitoring** ensures structural compliance
- **Dependency tracking** for maintenance planning
- **Documentation standards** improve overall quality

### Analytics & Insights
- **Usage pattern analysis** from metadata trends
- **Command categorization** for ecosystem understanding
- **Health metrics** for proactive maintenance

## Backward Compatibility

### Graceful Degradation
- Commands without proper documentation still function normally
- Index system handles missing metadata gracefully
- Legacy commands remain discoverable with basic information

### Gradual Adoption
- Improve documentation incrementally over time
- Use `pai-scaffold.md` to generate properly documented commands
- Update existing commands when convenient

## Integration with Meta-Commands

### pai-diagnostics
- Validates documentation structure
- Suggests improvements for better indexing
- Checks JSDoc compliance

### pai-audit
- Reports on documentation coverage across commands
- Identifies commands needing documentation updates
- Tracks documentation quality metrics

### pai-scaffold
- Generates commands with proper documentation templates
- Ensures new commands follow indexing best practices
- Includes appropriate metadata structure

## Example: Well-Documented Command

```markdown
#!/usr/bin/env bun
/**
 * # Financial Report Generator
 *
 * ## Purpose
 * Generates comprehensive financial reports from transaction data
 *
 * ## Description
 * Processes CSV transaction files and creates formatted financial reports with charts and analysis
 *
 * ## Usage
 * ```bash
 * # Generate monthly report
 * bun ${PAI_DIR}/commands/finance-report.md --month 2025-10
 * 
 * # Generate annual summary
 * bun ${PAI_DIR}/commands/finance-report.md --year 2025 --format pdf
 * ```
 *
 * ## Examples
 * ```bash
 * # Basic monthly report
 * bun ${PAI_DIR}/commands/finance-report.md --month 2025-10
 * 
 * # Detailed analysis with charts
 * bun ${PAI_DIR}/commands/finance-report.md --month 2025-10 --charts --detailed
 * ```
 *
 * @tags finance, reporting, analysis, automation
 * @author PAI User
 * @created 2025-10-08
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse';

// Implementation here...
```

This command would be indexed with:
- **Purpose**: "Generates comprehensive financial reports from transaction data"
- **Description**: "Processes CSV transaction files and creates formatted financial reports with charts and analysis"
- **Tags**: ["finance", "reporting", "analysis", "automation"]
- **Dependencies**: ["fs", "csv-parse"]
- **Usage Examples**: Multiple code blocks with different scenarios
- **Health**: "healthy" (proper structure)

## Troubleshooting

### Common Issues

#### Missing Metadata
- **Problem**: Command not appearing in search results
- **Solution**: Add `## Purpose` section with clear description

#### Poor Search Ranking
- **Problem**: Command found but not prominently
- **Solution**: Improve purpose/description clarity and add relevant tags

#### Health Warnings
- **Problem**: Command flagged as unhealthy
- **Solution**: Run `pai-diagnostics.md` for specific recommendations

### Validation Commands

```bash
# Check specific command documentation
bun ${PAI_DIR}/commands/pai-diagnostics.md /path/to/command.md

# Regenerate index after documentation updates
bun ${PAI_DIR}/commands/pai-index.md --update

# Search for commands to verify indexing
bun ${PAI_DIR}/commands/pai-index.md --search="your-keyword"
```

---

Following these documentation requirements ensures maximum benefit from the PAI Index system and contributes to a well-organized, discoverable command ecosystem.

# Example Reference File

## Purpose
This is an example reference file demonstrating how to organize reference materials in the `assets/` directory.

## What Goes in Reference Files

### Knowledge Reference
- Domain-specific information
- Technical specifications
- Standards and guidelines
- Best practices
- Common patterns
- Troubleshooting guides

### Quick Reference
- Command syntax
- API endpoints
- Configuration options
- Keyboard shortcuts
- Common workflows

### External References
- Links to documentation
- Related resources
- Community guides
- Tutorial links

## Example: API Reference

### Authentication
```bash
# API Key Authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.example.com/v1/resource
```

### Common Endpoints

**List Resources:**
```
GET /api/v1/resources
```

**Get Resource:**
```
GET /api/v1/resources/:id
```

**Create Resource:**
```
POST /api/v1/resources
Content-Type: application/json

{
  "name": "Example",
  "type": "demo"
}
```

**Update Resource:**
```
PUT /api/v1/resources/:id
Content-Type: application/json

{
  "name": "Updated Example"
}
```

**Delete Resource:**
```
DELETE /api/v1/resources/:id
```

## Example: Command Reference

### Common Commands

**Initialize:**
```bash
example-tool init --config default
```

**Run:**
```bash
example-tool run --input file.txt --output result.txt
```

**Debug:**
```bash
example-tool run --debug --verbose
```

**Test:**
```bash
example-tool test --all
```

### Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Configuration file | `config.yaml` |
| `--input` | Input file | stdin |
| `--output` | Output file | stdout |
| `--debug` | Enable debug mode | `false` |
| `--verbose` | Verbose output | `false` |

## Example: Configuration Reference

### Required Settings
```yaml
# Minimum required configuration
app:
  name: "My App"
  version: "1.0.0"

database:
  host: "localhost"
  database: "myapp"
```

### Optional Settings
```yaml
# Optional configuration with defaults
cache:
  enabled: true
  ttl: 3600

logging:
  level: "info"
  format: "json"

features:
  experimental: false
```

## Example: Troubleshooting Reference

### Common Issues

**Issue: Connection Timeout**
```
Error: Connection timeout after 30s
```
**Solution:**
- Check network connectivity
- Verify service is running
- Increase timeout setting
- Check firewall rules

**Issue: Permission Denied**
```
Error: EACCES: permission denied
```
**Solution:**
- Check file permissions
- Run with appropriate user
- Verify directory access
- Check ownership

## Best Practices

### Reference Organization
- ✅ Logical grouping
- ✅ Clear headings
- ✅ Searchable content
- ✅ Examples included
- ❌ Don't dump unstructured info
- ❌ Don't duplicate SKILL.md

### Reference Maintenance
- Keep up to date
- Verify examples work
- Remove obsolete info
- Link to external docs

### Reference Usage
- Load just-in-time (not all at once)
- Search before reading entire file
- Update when you find errors
- Add examples when helpful

## External Resources

- **Official Documentation:** https://docs.example.com
- **API Reference:** https://api.example.com/docs
- **Community Guide:** https://community.example.com
- **Tutorials:** https://learn.example.com

## Notes
This is a demonstration reference file. Real reference files should contain actual domain-specific information relevant to your skill.

---

**Pro Tip:** Reference files are great for information you need occasionally but don't want loaded all the time. Use progressive disclosure!

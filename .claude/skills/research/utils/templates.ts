/**
 * Workflow Template System
 *
 * Implements TAC Tactic #3 (Template Engineering):
 * - Save successful research workflows as templates
 * - Match user queries to similar past workflows
 * - Apply proven patterns to new research tasks
 *
 * Three times makes a pattern. Template it.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ResearchTemplate {
  template_id: string;
  name: string;
  description: string;
  query_pattern: string; // Regex pattern for matching queries
  example_queries: string[];
  agent_config: {
    agent_types: string[];
    parallel: boolean;
    timeout_ms?: number;
  };
  validation_config: {
    min_confidence: number;
    require_sources: boolean;
    check_contradictions: boolean;
  };
  auto_save_config: {
    enabled: boolean;
    risk_override?: 'safe' | 'review' | 'manual';
  };
  success_metrics: {
    avg_confidence: number;
    success_rate: number;
    usage_count: number;
  };
  created_at: string;
  last_used?: string;
  tags: string[];
}

export interface TemplateMatch {
  template: ResearchTemplate;
  confidence: number;
  reason: string;
}

/**
 * Template Manager
 * Handles storage, retrieval, and matching of research templates
 */
export class TemplateManager {
  private templateDir: string;
  private templates: Map<string, ResearchTemplate> = new Map();

  constructor(templateDir: string = './.claude/templates/research') {
    this.templateDir = templateDir;
    this.ensureTemplateDirectory();
    this.loadTemplates();
  }

  /**
   * Ensure template directory exists
   */
  private ensureTemplateDirectory(): void {
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
  }

  /**
   * Load all templates from disk
   */
  private loadTemplates(): void {
    if (!fs.existsSync(this.templateDir)) return;

    const files = fs.readdirSync(this.templateDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filepath = path.join(this.templateDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        const template = JSON.parse(content) as ResearchTemplate;

        this.templates.set(template.template_id, template);
      } catch (error) {
        console.error(`Failed to load template ${file}:`, error);
      }
    }

    console.log(`📚 Loaded ${this.templates.size} research templates`);
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `template-${timestamp}-${random}`;
  }

  /**
   * Create a new template from successful workflow
   */
  createTemplate(
    name: string,
    description: string,
    queryPattern: string,
    exampleQueries: string[],
    config: {
      agentTypes: string[];
      parallel?: boolean;
      minConfidence?: number;
      requireSources?: boolean;
      autoSave?: boolean;
    },
    tags: string[] = []
  ): ResearchTemplate {
    const templateId = this.generateTemplateId();

    const template: ResearchTemplate = {
      template_id: templateId,
      name,
      description,
      query_pattern: queryPattern,
      example_queries: exampleQueries,
      agent_config: {
        agent_types: config.agentTypes,
        parallel: config.parallel !== undefined ? config.parallel : true,
        timeout_ms: 300000 // 5 minutes default
      },
      validation_config: {
        min_confidence: config.minConfidence || 0.70,
        require_sources: config.requireSources !== undefined ? config.requireSources : true,
        check_contradictions: true
      },
      auto_save_config: {
        enabled: config.autoSave !== undefined ? config.autoSave : true
      },
      success_metrics: {
        avg_confidence: 0,
        success_rate: 0,
        usage_count: 0
      },
      created_at: new Date().toISOString(),
      tags
    };

    this.templates.set(templateId, template);
    this.persistTemplate(template);

    console.log(`✨ Created template: ${name} (${templateId})`);

    return template;
  }

  /**
   * Persist template to disk
   */
  private persistTemplate(template: ResearchTemplate): void {
    try {
      const filename = `${template.template_id}.json`;
      const filepath = path.join(this.templateDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(template, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to persist template ${template.template_id}:`, error);
    }
  }

  /**
   * Find matching templates for a query
   */
  findMatchingTemplates(query: string, maxResults: number = 3): TemplateMatch[] {
    const matches: TemplateMatch[] = [];

    for (const template of this.templates.values()) {
      // Try regex pattern match
      try {
        const pattern = new RegExp(template.query_pattern, 'i');
        if (pattern.test(query)) {
          matches.push({
            template,
            confidence: 0.9,
            reason: 'Pattern match'
          });
          continue;
        }
      } catch (error) {
        // Invalid regex, skip pattern matching
      }

      // Try keyword similarity
      const similarity = this.calculateSimilarity(query, template);
      if (similarity > 0.5) {
        matches.push({
          template,
          confidence: similarity,
          reason: 'Keyword similarity'
        });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches.slice(0, maxResults);
  }

  /**
   * Calculate similarity between query and template
   */
  private calculateSimilarity(query: string, template: ResearchTemplate): number {
    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/).filter(w => w.length > 3));

    // Check example queries
    let maxSimilarity = 0;

    for (const example of template.example_queries) {
      const exampleWords = new Set(example.toLowerCase().split(/\s+/).filter(w => w.length > 3));

      const intersection = new Set([...queryWords].filter(w => exampleWords.has(w)));
      const union = new Set([...queryWords, ...exampleWords]);

      const similarity = intersection.size / union.size;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Check tags
    const tagMatches = template.tags.filter(tag =>
      queryLower.includes(tag.toLowerCase())
    ).length;

    const tagBonus = Math.min(tagMatches * 0.1, 0.3);

    return Math.min(maxSimilarity + tagBonus, 1.0);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ResearchTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Update template after use
   */
  updateTemplateMetrics(
    templateId: string,
    success: boolean,
    confidence: number
  ): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    // Update metrics
    const oldAvg = template.success_metrics.avg_confidence;
    const oldCount = template.success_metrics.usage_count;

    template.success_metrics.usage_count += 1;
    template.success_metrics.avg_confidence =
      (oldAvg * oldCount + confidence) / template.success_metrics.usage_count;

    const oldSuccessCount = Math.round(template.success_metrics.success_rate * oldCount);
    const newSuccessCount = oldSuccessCount + (success ? 1 : 0);
    template.success_metrics.success_rate =
      newSuccessCount / template.success_metrics.usage_count;

    template.last_used = new Date().toISOString();

    this.persistTemplate(template);
  }

  /**
   * List all templates
   */
  listTemplates(filters?: {
    tags?: string[];
    minSuccessRate?: number;
    minUsageCount?: number;
  }): ResearchTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.tags) {
        templates = templates.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }

      if (filters.minSuccessRate !== undefined) {
        templates = templates.filter(t =>
          t.success_metrics.success_rate >= filters.minSuccessRate!
        );
      }

      if (filters.minUsageCount !== undefined) {
        templates = templates.filter(t =>
          t.success_metrics.usage_count >= filters.minUsageCount!
        );
      }
    }

    // Sort by success rate * usage count (proven templates first)
    templates.sort((a, b) => {
      const scoreA = a.success_metrics.success_rate * a.success_metrics.usage_count;
      const scoreB = b.success_metrics.success_rate * b.success_metrics.usage_count;
      return scoreB - scoreA;
    });

    return templates;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    try {
      const filename = `${templateId}.json`;
      const filepath = path.join(this.templateDir, filename);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      this.templates.delete(templateId);
      console.log(`🗑️  Deleted template: ${template.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete template ${templateId}:`, error);
      return false;
    }
  }

  /**
   * Export template as markdown for documentation
   */
  exportTemplateAsMarkdown(templateId: string): string {
    const template = this.templates.get(templateId);
    if (!template) return '';

    let md = `# ${template.name}\n\n`;
    md += `**Template ID**: ${template.template_id}\n\n`;
    md += `${template.description}\n\n`;

    md += `## Pattern\n\n`;
    md += `\`\`\`regex\n${template.query_pattern}\n\`\`\`\n\n`;

    md += `## Example Queries\n\n`;
    template.example_queries.forEach(q => {
      md += `- "${q}"\n`;
    });
    md += `\n`;

    md += `## Configuration\n\n`;
    md += `**Agents**: ${template.agent_config.agent_types.join(', ')}\n`;
    md += `**Parallel Execution**: ${template.agent_config.parallel ? 'Yes' : 'No'}\n`;
    md += `**Min Confidence**: ${Math.round(template.validation_config.min_confidence * 100)}%\n`;
    md += `**Auto-Save**: ${template.auto_save_config.enabled ? 'Enabled' : 'Disabled'}\n\n`;

    md += `## Success Metrics\n\n`;
    md += `- **Usage Count**: ${template.success_metrics.usage_count}\n`;
    md += `- **Success Rate**: ${Math.round(template.success_metrics.success_rate * 100)}%\n`;
    md += `- **Avg Confidence**: ${Math.round(template.success_metrics.avg_confidence * 100)}%\n\n`;

    md += `## Tags\n\n`;
    md += template.tags.map(t => `\`${t}\``).join(', ') || 'None';
    md += `\n\n`;

    md += `---\n`;
    md += `*Created: ${new Date(template.created_at).toLocaleDateString()}*\n`;
    if (template.last_used) {
      md += `*Last Used: ${new Date(template.last_used).toLocaleDateString()}*\n`;
    }

    return md;
  }
}

/**
 * Global template manager instance
 */
let globalTemplateManager: TemplateManager | null = null;

export function getTemplateManager(templateDir?: string): TemplateManager {
  if (!globalTemplateManager) {
    globalTemplateManager = new TemplateManager(templateDir);
  }
  return globalTemplateManager;
}

/**
 * Reset global template manager (useful for testing)
 */
export function resetTemplateManager(): void {
  globalTemplateManager = null;
}

/**
 * Seed default templates for common research patterns
 */
export function seedDefaultTemplates(manager: TemplateManager): void {
  // Template 1: Factual Research
  manager.createTemplate(
    'Factual Research',
    'Straightforward factual queries requiring reliable sources',
    '(what is|define|explain|history of|when did|who is)',
    [
      'What is quantum computing?',
      'Explain how photosynthesis works',
      'When did the Renaissance begin?'
    ],
    {
      agentTypes: ['research', 'fact-checker'],
      parallel: true,
      minConfidence: 0.75,
      requireSources: true,
      autoSave: true
    },
    ['factual', 'educational', 'safe']
  );

  // Template 2: Comparative Analysis
  manager.createTemplate(
    'Comparative Analysis',
    'Compare multiple options or approaches',
    '(compare|versus|vs|difference between|pros and cons)',
    [
      'Compare React vs Vue for web development',
      'What are the pros and cons of remote work?',
      'Difference between Python and JavaScript'
    ],
    {
      agentTypes: ['research', 'analyst'],
      parallel: true,
      minConfidence: 0.65,
      requireSources: true,
      autoSave: false // Requires review
    },
    ['comparative', 'analysis', 'review']
  );

  // Template 3: Current Events
  manager.createTemplate(
    'Current Events',
    'Recent news and developments',
    '(latest|recent|current|news about|developments in|2024|2025)',
    [
      'Latest developments in AI research',
      'Recent news about climate policy',
      'Current trends in cryptocurrency'
    ],
    {
      agentTypes: ['research', 'news-scanner'],
      parallel: true,
      minConfidence: 0.60,
      requireSources: true,
      autoSave: true
    },
    ['news', 'current-events', 'time-sensitive']
  );

  console.log('🌱 Seeded 3 default templates');
}

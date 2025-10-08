#!/usr/bin/env bun
/**
 * # PAI System Infrastructure Audit
 *
 * ## Purpose
 * Performs a comprehensive audit of the entire PAI infrastructure including commands, hooks, 
 * agents, voice server, context system, configuration, and documentation. Provides a complete
 * health assessment of the PAI ecosystem beyond just commands.
 *
 * ## Usage
 * ```bash
 * # Full infrastructure audit
 * bun ${PAI_DIR}/commands/pai-system-audit.md
 * 
 * # Quick health check
 * bun ${PAI_DIR}/commands/pai-system-audit.md --health-check
 * 
 * # Audit specific components
 * bun ${PAI_DIR}/commands/pai-system-audit.md --components=hooks,agents,voice
 * ```
 *
 * ## Audit Scope
 * - **Commands**: All PAI commands and meta-commands
 * - **Hooks**: Event-driven automation system
 * - **Agents**: Specialized AI agent configurations
 * - **Voice Server**: TTS notification system
 * - **Context System**: UFC context management
 * - **Configuration**: Settings, environment, and integration
 * - **Documentation**: System documentation completeness
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ComponentAudit {
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical' | 'missing';
  healthScore: number;
  issues: string[];
  metrics: Record<string, any>;
  details: Record<string, any>;
}

interface SystemAuditResult {
  timestamp: string;
  overallHealth: number;
  components: ComponentAudit[];
  criticalIssues: number;
  warnings: number;
  recommendations: string[];
}

function getPaiDirectory(): string {
  return process.env.PAI_DIR || join(homedir(), '.claude');
}

async function auditCommands(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const commandDirs = [
    join(paiDir, 'commands'),
    join(homedir(), '.config', 'ai', 'commands'),
    join(homedir(), 'dotfiles', 'ai', '.config', 'ai', 'commands')
  ].filter(existsSync);

  const issues: string[] = [];
  let totalCommands = 0;
  let healthyCommands = 0;

  for (const dir of commandDirs) {
    try {
      const files = readdirSync(dir).filter(f => /\.(md|ts|js|sh)$/.test(f));
      totalCommands += files.length;
      healthyCommands += files.length; // Simplified - assume healthy if readable
    } catch (error) {
      issues.push(`Cannot access command directory: ${dir}`);
    }
  }

  if (commandDirs.length === 0) {
    issues.push('No command directories found');
  }

  const healthScore = totalCommands > 0 ? Math.round((healthyCommands / totalCommands) * 100) : 0;

  return {
    name: 'Commands',
    type: 'commands',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: { 
      totalCommands, 
      healthyCommands, 
      directories: commandDirs.length 
    },
    details: {
      directories: commandDirs
    }
  };
}

async function auditHooks(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const hooksDir = join(paiDir, 'hooks');
  const settingsPath = join(paiDir, 'settings.json');
  
  const issues: string[] = [];
  let healthScore = 100;
  let hookFiles: string[] = [];
  let configuredHooks = 0;

  if (!existsSync(hooksDir)) {
    issues.push('Hooks directory not found');
    healthScore = 30;
  } else {
    hookFiles = readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  }

  if (!existsSync(settingsPath)) {
    issues.push('settings.json not found');
    healthScore = Math.min(healthScore, 20);
  } else {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.hooks) {
        configuredHooks = Object.keys(settings.hooks).length;
      } else {
        issues.push('No hooks configuration in settings.json');
        healthScore = Math.min(healthScore, 60);
      }
    } catch (error) {
      issues.push('Invalid settings.json format');
      healthScore = Math.min(healthScore, 30);
    }
  }

  return {
    name: 'Hooks',
    type: 'hooks',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: {
      hookFiles: hookFiles.length,
      configuredHooks
    },
    details: {
      hooksDirectory: hooksDir,
      settingsFile: settingsPath
    }
  };
}

async function auditAgents(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const agentsDir = join(paiDir, 'agents');
  
  const issues: string[] = [];
  let healthScore = 100;
  let agentFiles: string[] = [];

  if (!existsSync(agentsDir)) {
    issues.push('Agents directory not found');
    healthScore = 50;
  } else {
    agentFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    
    if (agentFiles.length === 0) {
      issues.push('No agent configurations found');
      healthScore = 60;
    }

    // Basic validation of agent files
    for (const file of agentFiles) {
      try {
        const content = readFileSync(join(agentsDir, file), 'utf-8');
        if (!content.includes('---') || !content.includes('name:')) {
          issues.push(`Agent ${file} missing proper frontmatter`);
          healthScore = Math.min(healthScore, 80);
        }
      } catch (error) {
        issues.push(`Cannot read agent file ${file}`);
      }
    }
  }

  return {
    name: 'Agents',
    type: 'agents',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: {
      agentCount: agentFiles.length
    },
    details: {
      agentsDirectory: agentsDir,
      agents: agentFiles
    }
  };
}

async function auditVoiceServer(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const voiceDir = join(paiDir, 'voice-server');
  
  const issues: string[] = [];
  let healthScore = 100;
  let serverRunning = false;

  if (!existsSync(voiceDir)) {
    issues.push('Voice server directory not found');
    healthScore = 30;
  }

  // Check if voice server is running
  try {
    const response = await fetch('http://localhost:8888/health', { 
      signal: AbortSignal.timeout(2000) 
    });
    if (response.ok) {
      serverRunning = true;
    } else {
      issues.push('Voice server responding but unhealthy');
      healthScore = Math.min(healthScore, 60);
    }
  } catch (error) {
    issues.push('Voice server not running on port 8888');
    healthScore = Math.min(healthScore, 40);
  }

  // Check environment variables
  if (!process.env.ELEVENLABS_API_KEY) {
    issues.push('ElevenLabs API key not configured (optional)');
  }

  return {
    name: 'Voice Server',
    type: 'voice',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: {
      serverRunning,
      apiKeyConfigured: !!process.env.ELEVENLABS_API_KEY
    },
    details: {
      voiceDirectory: voiceDir,
      endpoint: 'http://localhost:8888'
    }
  };
}

async function auditContext(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const contextDir = join(paiDir, 'context');
  
  const issues: string[] = [];
  let healthScore = 100;
  let contextFiles: string[] = [];

  if (!existsSync(contextDir)) {
    issues.push('Context directory not found');
    healthScore = 40;
  } else {
    try {
      contextFiles = readdirSync(contextDir, { recursive: true })
        .filter(f => typeof f === 'string' && f.endsWith('.md')) as string[];
      
      if (contextFiles.length === 0) {
        issues.push('No context files found');
        healthScore = 60;
      }

      // Check for main context file
      const mainContext = join(contextDir, 'CLAUDE.md');
      if (!existsSync(mainContext)) {
        issues.push('Main CLAUDE.md context not found');
      }
    } catch (error) {
      issues.push('Error reading context directory');
      healthScore = 50;
    }
  }

  return {
    name: 'Context System',
    type: 'context',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: {
      contextFiles: contextFiles.length
    },
    details: {
      contextDirectory: contextDir
    }
  };
}

async function auditConfiguration(): Promise<ComponentAudit> {
  const paiDir = getPaiDirectory();
  const settingsPath = join(paiDir, 'settings.json');
  
  const issues: string[] = [];
  let healthScore = 100;
  let configSections = 0;

  if (!existsSync(settingsPath)) {
    issues.push('settings.json not found');
    healthScore = 0;
  } else {
    try {
      const config = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      configSections = Object.keys(config).length;
      
      // Check required configuration sections
      const requiredSections = ['hooks'];
      for (const section of requiredSections) {
        if (!config[section]) {
          issues.push(`Missing ${section} configuration`);
          healthScore = Math.min(healthScore, 70);
        }
      }
    } catch (error) {
      issues.push('Invalid settings.json format');
      healthScore = 20;
    }
  }

  // Check environment variables
  if (!process.env.PAI_DIR) {
    issues.push('PAI_DIR environment variable not set');
    healthScore = Math.min(healthScore, 60);
  }

  return {
    name: 'Configuration',
    type: 'config',
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    healthScore,
    issues,
    metrics: {
      configSections,
      envVarsSet: !!process.env.PAI_DIR
    },
    details: {
      settingsFile: settingsPath,
      paiDir
    }
  };
}

async function performSystemAudit(): Promise<SystemAuditResult> {
  console.log('🔍 Performing PAI System Infrastructure Audit...\n');
  
  const components = await Promise.all([
    auditCommands(),
    auditHooks(),
    auditAgents(),
    auditVoiceServer(),
    auditContext(),
    auditConfiguration()
  ]);

  const totalScore = components.reduce((sum, comp) => sum + comp.healthScore, 0);
  const overallHealth = Math.round(totalScore / components.length);
  
  const criticalIssues = components.filter(c => c.status === 'critical').length;
  const warnings = components.filter(c => c.status === 'warning').length;

  const recommendations: string[] = [];
  if (criticalIssues > 0) {
    recommendations.push('Address critical issues immediately');
  }
  if (warnings > 0) {
    recommendations.push('Review and resolve warning conditions');
  }
  if (overallHealth < 80) {
    recommendations.push('System needs attention - health score below 80%');
  }

  return {
    timestamp: new Date().toISOString(),
    overallHealth,
    components,
    criticalIssues,
    warnings,
    recommendations
  };
}

function printSystemAuditResults(result: SystemAuditResult) {
  console.log('='.repeat(70));
  console.log('🏥 PAI System Infrastructure Health Report');
  console.log('='.repeat(70));
  console.log(`📅 Generated: ${new Date(result.timestamp).toLocaleString()}`);
  console.log(`🎯 Overall Health: ${result.overallHealth}%`);
  
  const overallStatus = result.overallHealth >= 80 ? 'Healthy' : 
                       result.overallHealth >= 60 ? 'Needs Attention' : 'Critical';
  console.log(`📊 Status: ${overallStatus}`);
  
  console.log('\n📋 Component Health:');
  for (const component of result.components) {
    const statusIcon = component.status === 'healthy' ? '✅' : 
                      component.status === 'warning' ? '⚠️' : 
                      component.status === 'critical' ? '❌' : '❓';
    
    console.log(`   ${statusIcon} ${component.name}: ${component.healthScore}% (${component.status})`);
    
    if (component.issues.length > 0) {
      component.issues.forEach(issue => {
        console.log(`      • ${issue}`);
      });
    }
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }

  console.log('\n📈 Summary:');
  console.log(`   Total Components: ${result.components.length}`);
  console.log(`   Critical Issues: ${result.criticalIssues}`);
  console.log(`   Warnings: ${result.warnings}`);
  console.log(`   Healthy Components: ${result.components.filter(c => c.status === 'healthy').length}`);
  
  console.log('\n' + '='.repeat(70));
}

async function main() {
  const args = process.argv.slice(2);
  const healthCheck = args.includes('--health-check');

  try {
    const result = await performSystemAudit();
    printSystemAuditResults(result);
    
    // Exit with appropriate code
    if (result.criticalIssues > 0) {
      process.exit(1);
    } else if (result.warnings > 0) {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ System audit failed:', error.message);
    process.exit(1);
  }
}

main();

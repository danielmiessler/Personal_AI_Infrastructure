import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
  generateSystemPrompt,
  getCoreContext,
  getExtendedContext,
  scanSkills,
  main,
} from './adapter';

// Mock fs, path, and child_process
vi.mock('fs');
vi.mock('child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0, stdout: '', stderr: '' })),
}));
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>();
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
  };
});

describe('Gemini Adapter Tests', () => {
  const mockPaiDir = '/mock/pai';

  beforeEach(() => {
    vi.resetModules();
    process.env.PAI_DIR = mockPaiDir;
    process.env.TIME_ZONE = 'UTC';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getCoreContext', () => {
    it('should load DAIDENTITY.md and SKILL.md if they exist', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return pathStr.includes('DAIDENTITY.md') || pathStr.includes('CORE/SKILL.md');
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().includes('DAIDENTITY.md')) return 'IDENTITY CONTENT';
        if (p.toString().includes('CORE/SKILL.md')) return 'SKILL CONTENT';
        return '';
      });

      const context = getCoreContext();
      expect(context).toContain('=== 🆔 IDENTITY ===');
      expect(context).toContain('IDENTITY CONTENT');
      expect(context).toContain('=== 🧠 CORE SKILL ===');
      expect(context).toContain('SKILL CONTENT');
    });

    it('should use legacy identity.md if DAIDENTITY.md missing', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return (
          (pathStr.includes('identity.md') && !pathStr.includes('DAIDENTITY.md')) ||
          pathStr.includes('CORE/SKILL.md')
        );
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().includes('identity.md')) return 'LEGACY IDENTITY';
        if (p.toString().includes('CORE/SKILL.md')) return 'SKILL CONTENT';
        return '';
      });

      const context = getCoreContext();
      expect(context).toContain('LEGACY IDENTITY');
    });

    it('should handle missing core files gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = getCoreContext();
      expect(context).toContain('PAI Core Skill definition not found');
    });
  });

  describe('Hook Orchestration', () => {
    it('should execute PAI hooks from settings.json', async () => {
      const mockSettings = {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                { type: 'command', command: '$PAI_DIR/hooks/SecurityValidator.hook.ts' }
              ]
            }
          ]
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().includes('settings.json')) return JSON.stringify(mockSettings);
        if (p === 0) return JSON.stringify({ hook: 'BeforeTool', payload: { tool: 'ls' } });
        return '';
      });

      await main();

      expect(spawnSync).toHaveBeenCalledWith(
        '/mock/pai/hooks/SecurityValidator.hook.ts',
        [],
        expect.objectContaining({
          input: expect.stringContaining('"hook_event_name":"PreToolUse"'),
          shell: true
        })
      );
    });

    it('should handle blocked hooks (exit code 2)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(spawnSync).mockReturnValue({ status: 2, stdout: 'BLOCKED BY SECURITY', stderr: '' } as any);
      
      const mockSettings = {
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'test-hook' }] }]
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().includes('settings.json')) return JSON.stringify(mockSettings);
        if (p === 0) return JSON.stringify({ hook: 'BeforeTool', payload: { tool: 'ls' } });
        return '';
      });

      await main();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[PAI Hook Blocked]'));
    });

    it('should handle missing settings.json', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === 0) return JSON.stringify({ hook: 'BeforeTool', payload: {} });
        return '';
      });
      await main();
      expect(spawnSync).not.toHaveBeenCalled();
    });
  });

  describe('generateSystemPrompt', () => {
      it('should generate a full system prompt with all sections', () => {
          vi.mocked(fs.existsSync).mockReturnValue(true);
          vi.mocked(fs.readFileSync).mockImplementation((path) => {
             const p = path.toString();
             if(p === 0) return '';
             if(p.includes('SKILL.md')) {
                 return `---\nname: MockSkill
description: A mock skill for testing
---\nCONTENT from ${path}`;
             }
             return `CONTENT from ${path}`;
          });
          vi.mocked(fs.readdirSync).mockImplementation((path) => {
              const p = path.toString();
              if(p.includes('skills')) return ['CORE', 'Agents'] as any;
              return ['file1.txt'] as any;
          });
          
          const prompt = generateSystemPrompt();
          expect(prompt).toContain('PAI GEMINI BRIDGE ACTIVE');
          expect(prompt).toContain('**MockSkill**: A mock skill for testing');
      });
  });

  describe('main', () => {
    it('should handle --context flag', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const originalArgv = process.argv;
        process.argv = ['node', 'adapter.js', '--context'];
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([]);

        await main();
        
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls[0][0]).toContain('PAI GEMINI BRIDGE ACTIVE');
        process.argv = originalArgv;
    });

    it('should handle --hook flag', async () => {
        const originalArgv = process.argv;
        process.argv = ['node', 'adapter.js', '--hook', 'SessionEnd', '--payload', '{"test":"true"}'];
        
        vi.mocked(fs.existsSync).mockImplementation((p) => p.toString().includes('settings.json'));
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: 'test-hook' }] }] } }));
        
        await main();
        
        expect(spawnSync).toHaveBeenCalled();
        process.argv = originalArgv;
    });

    it('should handle invalid input gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.mocked(fs.readFileSync).mockImplementation((fd) => {
            if (fd === 0) return 'INVALID JSON';
            return '';
        });
        await main();
        expect(consoleSpy).toHaveBeenCalledWith('{}');
    });

    it('should exit if no input', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.mocked(fs.readFileSync).mockImplementation((fd) => {
            if (fd === 0) return '';
            return '';
        });
        await main();
        expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Helpers', () => {
    it('getExtendedContext should load files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('FILE CONTENT');
      const context = getExtendedContext();
      expect(context).toContain('=== BASIC INFO ===');
    });

    it('scanSkills should return skill list', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['Agents'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue('name: Test\ndescription: Desc');
      const skills = scanSkills();
      expect(skills[0].name).toBe('Test');
    });
  });
});

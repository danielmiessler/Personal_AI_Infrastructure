import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateSystemPrompt,
  getCoreContext,
  getExtendedContext,
  getLocalTimestamp,
  logToPAI,
  main,
} from './adapter';

// Mock fs and path
vi.mock('fs');
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>();
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
  };
});

describe('Gemini Adapter Tests', () => {
  const mockPaiDir = '/mock/pai';
  const mockRawOutputsDir = '/mock/pai/history/raw-outputs';
  const mockSkillsDir = '/mock/pai/skills';

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

  describe('getExtendedContext', () => {
    it('should load extended context files if they exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('FILE CONTENT');

      const context = getExtendedContext();
      expect(context).toContain('=== BASIC INFO ===');
      expect(context).toContain('=== CONTACTS ===');
      expect(context).toContain('=== TECH STACK ===');
      expect(context).toContain('=== TELOS (GOALS) ===');
    });

    it('should skip missing files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = getExtendedContext();
      expect(context).toBe('');
    });
  });

  describe('logToPAI', () => {
    it('should append log entry to file', () => {
      const appendSpy = vi.mocked(fs.appendFileSync);
      vi.mocked(fs.existsSync).mockReturnValue(true); // Directory exists

      logToPAI('TestEvent', { foo: 'bar' });

      expect(appendSpy).toHaveBeenCalled();
      const callArgs = appendSpy.mock.calls[0];
      const logContent = JSON.parse(callArgs[1] as string);

      expect(logContent).toMatchObject({
        hook_event_type: 'TestEvent',
        source_app: 'gemini',
        payload: { foo: 'bar' },
      });
    });

     it('should create directory if not exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const mkdirSpy = vi.mocked(fs.mkdirSync);
        logToPAI('TestEvent', {});
        expect(mkdirSpy).toHaveBeenCalled();
     });
  });
  
  describe('generateSystemPrompt', () => {
      it('should generate a full system prompt with all sections', () => {
          // Mock everything to exist
          vi.mocked(fs.existsSync).mockReturnValue(true);
          vi.mocked(fs.readFileSync).mockImplementation((path) => {
             const p = path.toString();
             if(p === 0) return ''; // Stdin
             if(p.includes('SKILL.md')) {
                 return `---
name: MockSkill
description: A mock skill for testing
---
CONTENT from ${path}`;
             }
             return `CONTENT from ${path}`;
          });
          vi.mocked(fs.readdirSync).mockImplementation((path) => {
              const p = path.toString();
              // Loose check for skills directory
              if(p.includes('skills')) return ['CORE', 'Agents', '.hidden'] as any;
              return ['file1.txt', 'file2.js'] as any;
          });
          vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
          
          const prompt = generateSystemPrompt();
          
          expect(prompt).toContain('PAI GEMINI BRIDGE ACTIVE');
          // Expect loose path matching because path.join might produce slightly different separators
          expect(prompt).toContain('CONTENT from /mock/pai/skills/CORE/USER/DAIDENTITY.md');
          expect(prompt).toContain('**MockSkill**: A mock skill for testing'); // Skill name/desc
          expect(prompt).toContain('/mock/pai/skills/Agents/SKILL.md'); // Skill path
          expect(prompt).toContain('CONTENT from /mock/pai/MEMORY/State/active-work.json'); // Memory
          expect(prompt).toContain('file1.txt'); // Project files
      });
  });

  describe('main', () => {
    it('should handle --context flag', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const originalArgv = process.argv;
        process.argv = [...originalArgv, '--context'];
        
        // Mock fs to ensure no readFileSync happens (or if it does, it doesn't break)
        // We actually expect it NOT to read stdin
        const readSpy = vi.mocked(fs.readFileSync);
        
        await main();
        
        expect(consoleSpy).toHaveBeenCalled();
        const output = consoleSpy.mock.calls[0][0];
        expect(output).toContain('PAI GEMINI BRIDGE ACTIVE');
        
        // Restore argv
        process.argv = originalArgv;
    });

    it('should handle SessionStart hook', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.mocked(fs.readFileSync).mockImplementation((fd) => {
            if (fd === 0) return JSON.stringify({ hook: 'SessionStart', payload: {} });
            return 'CONTENT';
        });
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([]);

        await main();

        expect(consoleSpy).toHaveBeenCalled();
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toHaveProperty('hookSpecificOutput');
        expect(output.hookSpecificOutput).toHaveProperty('systemInstruction');
    });

    it('should handle Tool hooks (BeforeTool)', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ hook: 'BeforeTool', payload: { tool: 'ls'} }));
        
        await main();
        
        // Should log empty response for non-SessionStart hooks
        expect(consoleSpy).toHaveBeenCalledWith('{}');
        // But should have called appendFileSync (via logToPAI)
        expect(fs.appendFileSync).toHaveBeenCalled();
    });
    
    it('should handle invalid input gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
         vi.mocked(fs.readFileSync).mockReturnValue('INVALID JSON');
         
         await main();
         
         expect(consoleSpy).toHaveBeenCalledWith('{}');
    });
    
     it('should exit if no input', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
         vi.mocked(fs.readFileSync).mockReturnValue('');
         
         await main();
         
         expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});

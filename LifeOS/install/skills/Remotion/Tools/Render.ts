/**
 * Remotion Code-First Interface
 *
 * TypeScript wrappers for Remotion CLI operations.
 * Enables programmatic video rendering with full control.
 */

import { $ } from 'bun'

export interface RenderOptions {
  /** Composition ID to render */
  compositionId: string
  /** Output file path */
  outputPath: string
  /** Video codec. AV1 not supported on Linux ARM64 GNU or on Lambda. */
  codec?: 'h264' | 'h265' | 'av1' | 'vp8' | 'vp9' | 'prores' | 'gif' | 'h264-mkv'
  /** Constant Rate Factor (quality, lower = better, 0-51) */
  crf?: number
  /** Frames per second */
  fps?: number
  /** Video width */
  width?: number
  /** Video height */
  height?: number
  /** Props to pass to composition */
  inputProps?: Record<string, any>
  /** Project directory (defaults to cwd) */
  projectDir?: string
  /** Specific frames to render (e.g., "0-100") */
  frames?: string
  /** Image sequence output format */
  imageFormat?: 'png' | 'jpeg'
  /** JPEG quality (0-100) */
  jpegQuality?: number
  /** Scale factor */
  scale?: number
  /** Mute audio */
  muted?: boolean
  /** Audio codec */
  audioCodec?: 'aac' | 'mp3' | 'opus' | 'wav' | 'pcm'
  /** Audio sample rate in Hz (e.g. 44100, 48000) */
  sampleRate?: number
  /** Audio bitrate (e.g. "128k") */
  audioBitrate?: string
  /** Video bitrate (e.g. "4M") */
  videoBitrate?: string
  /** Number of render threads */
  concurrency?: number
  /** Verbose output */
  verbose?: boolean
}

export interface Composition {
  id: string
  width: number
  height: number
  fps: number
  durationInFrames: number
  defaultProps?: Record<string, any>
}

export interface RenderResult {
  success: boolean
  outputPath: string
  duration?: number
  error?: string
}

/**
 * Render a Remotion composition to video file
 *
 * @param options - Render configuration
 * @returns Render result
 */
export async function render(options: RenderOptions): Promise<RenderResult> {
  const args: string[] = ['bunx', 'remotion', 'render', options.compositionId, options.outputPath]

  if (options.codec) args.push('--codec', options.codec)
  if (options.crf !== undefined) args.push('--crf', String(options.crf))
  if (options.fps) args.push('--fps', String(options.fps))
  if (options.width) args.push('--width', String(options.width))
  if (options.height) args.push('--height', String(options.height))
  if (options.frames) args.push('--frames', options.frames)
  if (options.imageFormat) args.push('--image-format', options.imageFormat)
  if (options.jpegQuality) args.push('--jpeg-quality', String(options.jpegQuality))
  if (options.scale) args.push('--scale', String(options.scale))
  if (options.muted) args.push('--muted')
  if (options.audioCodec) args.push('--audio-codec', options.audioCodec)
  if (options.sampleRate) args.push('--sample-rate', String(options.sampleRate))
  if (options.audioBitrate) args.push('--audio-bitrate', options.audioBitrate)
  if (options.videoBitrate) args.push('--video-bitrate', options.videoBitrate)
  if (options.concurrency) args.push('--concurrency', String(options.concurrency))

  if (options.inputProps) {
    args.push('--props', JSON.stringify(options.inputProps))
  }

  const startTime = Date.now()
  const cwd = options.projectDir || process.cwd()

  try {
    const result = await $`${args}`.cwd(cwd).text()
    const duration = (Date.now() - startTime) / 1000

    return {
      success: true,
      outputPath: options.outputPath,
      duration
    }
  } catch (error: any) {
    return {
      success: false,
      outputPath: options.outputPath,
      error: error.message || String(error)
    }
  }
}

/**
 * Render a still image from a composition
 *
 * @param options - Still render configuration
 * @returns Render result
 */
export async function renderStill(options: {
  compositionId: string
  outputPath: string
  frame?: number
  inputProps?: Record<string, any>
  projectDir?: string
  imageFormat?: 'png' | 'jpeg'
  jpegQuality?: number
  scale?: number
}): Promise<RenderResult> {
  const args: string[] = ['bunx', 'remotion', 'still', options.compositionId, options.outputPath]

  if (options.frame !== undefined) args.push('--frame', String(options.frame))
  if (options.imageFormat) args.push('--image-format', options.imageFormat)
  if (options.jpegQuality) args.push('--jpeg-quality', String(options.jpegQuality))
  if (options.scale) args.push('--scale', String(options.scale))

  if (options.inputProps) {
    args.push('--props', JSON.stringify(options.inputProps))
  }

  const cwd = options.projectDir || process.cwd()

  try {
    await $`${args}`.cwd(cwd).text()

    return {
      success: true,
      outputPath: options.outputPath
    }
  } catch (error: any) {
    return {
      success: false,
      outputPath: options.outputPath,
      error: error.message || String(error)
    }
  }
}

/**
 * List all compositions in a Remotion project
 *
 * `remotion compositions` requires an entry point and has no `--json` flag. It
 * prints a fixed-width table to stdout, preceded by Bun's "You are running
 * Remotion with Bun" banner and bundling progress — so the output is parsed
 * line by line rather than handed to JSON.parse.
 * // public issue #1763, #1760, @jacobo-ortiz
 *
 * @param entryPoint - Remotion entry point, e.g. `src/index.ts`
 * @param projectDir - Project directory (defaults to cwd)
 * @returns Array of compositions
 * @throws If the CLI fails or its output cannot be recognised
 */
export async function listCompositions(entryPoint: string, projectDir?: string): Promise<Composition[]> {
  const cwd = projectDir || process.cwd()

  let output: string
  try {
    output = await $`bunx remotion compositions ${entryPoint}`.cwd(cwd).text()
  } catch (error: any) {
    throw new Error(`remotion compositions failed for entry point "${entryPoint}": ${error.message || String(error)}`)
  }

  if (!output.includes('The following compositions are available')) {
    throw new Error(`Unrecognised output from remotion compositions:\n${output}`)
  }

  // Row form: <id> <fps> <width>x<height> <durationInFrames> (<n> sec).
  // Stills print an empty fps column and the word "Still" instead of a duration.
  const row = /^(\S+)\s+(?:(\d+)\s+)?(\d+)x(\d+)\s+(?:Still|(\d+)\s+\([\d.]+\s+sec\))\s*$/

  return output
    .split('\n')
    .map((line) => line.match(row))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      id: match[1],
      fps: match[2] ? Number(match[2]) : 0,
      width: Number(match[3]),
      height: Number(match[4]),
      durationInFrames: match[5] ? Number(match[5]) : 1
    }))
}

/**
 * Start the Remotion studio preview server
 *
 * @param options - Studio options
 */
export async function startStudio(options?: {
  projectDir?: string
  port?: number
  browserArgs?: string[]
}): Promise<void> {
  const args: string[] = ['bunx', 'remotion', 'studio']

  if (options?.port) args.push('--port', String(options.port))

  const cwd = options?.projectDir || process.cwd()

  // Run in background - studio stays open
  $`${args}`.cwd(cwd).nothrow()

  console.log(`Remotion Studio starting at http://localhost:${options?.port || 3000}`)
}

/** The 22 templates `create-video` accepts, each passed as its own flag. */
export type RemotionTemplate =
  | 'blank' | 'hello-world' | 'next' | 'vercel' | 'next-no-tailwind' | 'next-pages-dir'
  | 'recorder' | 'prompt-to-motion-graphics' | 'javascript' | 'render-server' | 'electron'
  | 'react-router' | 'three' | 'still' | 'audiogram' | 'music-visualization'
  | 'prompt-to-video' | 'skia' | 'overlay' | 'code-hike' | 'stargazer' | 'tiktok'

/**
 * Create a new Remotion project
 *
 * Canonical form is `create-video --yes --<template> <directory>` — the template
 * is a flag, not the value of `--template`, and the directory comes last.
 * `--yes` requires a template flag, so one is always sent.
 * // public issue #1763, #1760, @jacobo-ortiz
 *
 * @param options - Project creation options
 */
export async function createProject(options: {
  name: string
  template?: RemotionTemplate
  outputDir?: string
}): Promise<{ success: boolean; path: string; error?: string }> {
  const args: string[] = [
    'bunx',
    'create-video@latest',
    '--yes',
    `--${options.template ?? 'blank'}`,
    options.name
  ]

  const cwd = options.outputDir || process.cwd()

  try {
    await $`${args}`.cwd(cwd).text()

    return {
      success: true,
      path: `${cwd}/${options.name}`
    }
  } catch (error: any) {
    return {
      success: false,
      path: `${cwd}/${options.name}`,
      error: error.message || String(error)
    }
  }
}

/**
 * Upgrade Remotion packages in a project
 *
 * @param projectDir - Project directory
 */
export async function upgrade(projectDir?: string): Promise<{ success: boolean; error?: string }> {
  const cwd = projectDir || process.cwd()

  try {
    await $`bunx remotion upgrade`.cwd(cwd).text()
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error)
    }
  }
}

/**
 * Get video metadata with ffprobe
 *
 * There is no `remotion parse-video` subcommand, and `@remotion/media-utils` is
 * browser-side, so neither works from Node. ffprobe is already a pipeline
 * dependency and reads the file directly.
 * // public issue #1763, #1760, @jacobo-ortiz
 *
 * @throws If ffprobe fails or the file carries no video stream
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  width: number
  height: number
  durationInSeconds: number
  fps: number
}> {
  let raw: string
  try {
    raw = await $`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate:format=duration -of json ${videoPath}`.text()
  } catch (error: any) {
    throw new Error(`ffprobe failed for ${videoPath}: ${error.message || String(error)}`)
  }

  const probe = JSON.parse(raw)
  const stream = probe.streams?.[0]
  if (!stream) throw new Error(`No video stream found in ${videoPath}`)

  // r_frame_rate is a rational string such as "30000/1001"
  const [numerator, denominator] = String(stream.r_frame_rate ?? '').split('/')
  const fps = Number(numerator) / Number(denominator)
  const durationInSeconds = Number(probe.format?.duration)

  if (!Number.isFinite(fps)) throw new Error(`ffprobe reported no frame rate for ${videoPath}`)
  if (!Number.isFinite(durationInSeconds)) throw new Error(`ffprobe reported no duration for ${videoPath}`)

  return {
    width: Number(stream.width),
    height: Number(stream.height),
    durationInSeconds,
    fps
  }
}

/**
 * Get audio duration in seconds with ffprobe
 *
 * Same reasoning as getVideoMetadata — `remotion parse-audio` does not exist.
 * // public issue #1763, #1760, @jacobo-ortiz
 *
 * @throws If ffprobe fails or the file carries no audio stream
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  let raw: string
  try {
    raw = await $`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type:format=duration -of json ${audioPath}`.text()
  } catch (error: any) {
    throw new Error(`ffprobe failed for ${audioPath}: ${error.message || String(error)}`)
  }

  const probe = JSON.parse(raw)
  if (!probe.streams?.[0]) throw new Error(`No audio stream found in ${audioPath}`)

  const durationInSeconds = Number(probe.format?.duration)
  if (!Number.isFinite(durationInSeconds)) throw new Error(`ffprobe reported no duration for ${audioPath}`)

  return durationInSeconds
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'render': {
      const [_, compositionId, outputPath, ...rest] = args
      if (!compositionId || !outputPath) {
        console.error('Usage: bun run index.ts render <compositionId> <outputPath> [--crf N] [--fps N]')
        process.exit(1)
      }

      const options: RenderOptions = { compositionId, outputPath }

      // Parse optional args
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--crf' && rest[i + 1]) options.crf = parseInt(rest[++i])
        if (rest[i] === '--fps' && rest[i + 1]) options.fps = parseInt(rest[++i])
        if (rest[i] === '--codec' && rest[i + 1]) options.codec = rest[++i] as any
        if (rest[i] === '--width' && rest[i + 1]) options.width = parseInt(rest[++i])
        if (rest[i] === '--height' && rest[i + 1]) options.height = parseInt(rest[++i])
      }

      const result = await render(options)
      console.log(JSON.stringify(result, null, 2))
      break
    }

    case 'list': {
      const entryPoint = args[1]
      if (!entryPoint) {
        console.error('Usage: bun run index.ts list <entryPoint> [projectDir]')
        process.exit(1)
      }

      const compositions = await listCompositions(entryPoint, args[2])
      console.log(JSON.stringify(compositions, null, 2))
      break
    }

    case 'create': {
      const name = args[1]
      const template = args[2] as any

      if (!name) {
        console.error('Usage: bun run index.ts create <name> [template]')
        process.exit(1)
      }

      const result = await createProject({ name, template })
      console.log(JSON.stringify(result, null, 2))
      break
    }

    default:
      console.log(`
Remotion CLI Wrapper

Commands:
  render <compositionId> <outputPath> [--crf N] [--fps N] [--codec TYPE]
  list <entryPoint> [projectDir]
  create <name> [template]

Examples:
  bun run index.ts render my-video out/video.mp4 --crf 18
  bun run index.ts list src/index.ts
  bun run index.ts create new-project hello-world
`)
  }
}

---
name: remotion-critical-rules
description: What NOT to do in Remotion — failure modes that break renders
metadata:
  tags: remotion, rules, gotchas, don't, pitfalls
---

# Critical Rules — What NOT to Do

Non-obvious failure modes that break Remotion renders. These are all real issues that cause silent failures, flickering, or wrong output.

## 1. NO CSS animations

CSS `@keyframes`, `transition`, and `animation` properties **do not render**. The frame-by-frame render reads DOM state at each frame — CSS animations assume continuous time and produce nothing.

**Wrong:**
```tsx
<div style={{ animation: 'fadeIn 1s' }}>Hello</div>
```

**Right:**
```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
<div style={{ opacity }}>Hello</div>
```

## 2. NO third-party animation libraries

Framer Motion, GSAP, React Spring, etc. drive animations from `requestAnimationFrame` — not from the Remotion frame counter. They produce flickering or frozen output during render. Drive all motion from `useCurrentFrame()` + `interpolate()` / `spring()`.

## 3. ALWAYS use `staticFile()` for `/public` assets

Don't hardcode `/audio.mp3` or relative paths. `staticFile()` resolves correctly in both Studio and server render.

```tsx
import { staticFile } from 'remotion';
<Audio src={staticFile('audio.mp3')} />
```

## 4. ALWAYS clamp interpolation

Unclamped `interpolate()` extrapolates past the output range, producing opacity > 1, sizes that flip negative, colors that overflow. Always pass `extrapolateRight: 'clamp'` (and `extrapolateLeft` if the input can be negative).

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp',
});
```

## 5. Define props with Zod schemas

Props without schemas can't be edited in Studio and can't be passed safely via `--props` CLI flag. Always define a Zod schema on `<Composition>`.

```tsx
import { z } from 'zod';

const schema = z.object({ title: z.string(), duration: z.number() });

<Composition id="my-video" component={MyVideo} schema={schema} defaultProps={{ title: 'Hi', duration: 90 }} ... />
```

## 6. `renderStillOnWeb()` returns async methods, not values (v4.0.397+)

<!-- public issue #1763, #1760, @jacobo-ortiz -->
Three things trip people up. It lives in `@remotion/web-renderer` (not `@remotion/renderer/web`, which does not resolve). `composition` is an object describing the composition, not an id string, and `frame` is required. And `canvas()`, `blob()` and `url()` are **methods returning promises** — destructuring them gives you functions, not output.

```tsx
import { renderStillOnWeb } from '@remotion/web-renderer';

const still = await renderStillOnWeb({
  composition: {
    id: 'my-still',
    component: MyComposition,
    durationInFrames: 100,
    fps: 30,
    width: 1920,
    height: 1080,
  },
  frame: 0,
});

const pngBlob = await still.blob({ format: 'png' });
```

## 7. AV1 has platform limits

AV1 codec is NOT available on:
- Linux ARM64 GNU (missing ffmpeg codec)
- Remotion Lambda (use h264/h265/vp8/vp9/prores there)

Use AV1 for local renders targeting modern web; fall back to h264 everywhere else.

## 8. Licensing is by organization size, not commercial vs personal

<!-- public issue #1753, @jacobo-ortiz -->
The Free License covers individuals, non-profits, anyone evaluating, and **for-profit organizations with up to 3 employees** — and it grants commercial use outright. Unattended rendering (CLI, `renderMedia()`, Lambda, CI) is included when you qualify; Lambda adds no separate paid tier of its own. Above the 3-employee threshold you need a Company License from remotion.pro.

There is no such thing as a "Cloud Rendering Unit" — that unit was retired.

Remotion 5.0 changes the license slightly (contractors will count toward team size). Check `LICENSE.md` upstream before costing a pipeline: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md

## 9. `toneFrequency` only works server-side

Pitch shifting on `<Audio>` / `<Video>` runs only during `bunx remotion render`, not in Studio preview or `<Player>`. If your preview sounds wrong, that's expected — render to confirm.

## 10. `bunx`, never `npx`

All Remotion commands run via `bunx remotion ...`. `npx` is forbidden in this codebase (per global operational rules).

```bash
bunx remotion render my-video "${LIFEOS_DOWNLOADS_DIR:-$HOME/Downloads}"/out.mp4
bunx remotion studio
bunx remotion lambda render ...
```

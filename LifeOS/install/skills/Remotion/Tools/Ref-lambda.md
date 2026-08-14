---
name: lambda
description: Render Remotion videos on AWS Lambda for fast, parallel, scalable cloud rendering
metadata:
  tags: lambda, aws, cloud, rendering, scale, parallel, production
---

# Remotion Lambda

<!-- public issue #1764, #1760, @jacobo-ortiz -->
Render videos on AWS Lambda. Chunks render in parallel across up to 200 Lambda invocations — a hard cap, not a soft guideline; every render uses between 3 and 200 concurrent functions — then the primary function stitches the output. A 3-minute video renders in ~30 seconds instead of minutes.

## Prerequisites

- AWS account with IAM user (Remotion Lambda policy attached — see docs)
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in environment
- `@remotion/lambda` installed in the project

```bash
bunx remotion add @remotion/lambda
```

## One-time setup (per AWS region)

Deploy the Lambda function. Reusable across all your projects in that region.

```bash
bunx remotion lambda functions deploy
```

List existing functions:

```bash
bunx remotion lambda functions ls
```

## Per-project: deploy the site

Your Remotion project deploys as a static site to S3.

```bash
bunx remotion lambda sites create src/index.ts --site-name=my-project
```

List sites:

```bash
bunx remotion lambda sites ls
```

## Render a video

```bash
bunx remotion lambda render <site-url> <composition-id> \
  --props='{"title":"Hello"}' \
  --codec=h264 \
  --privacy=private
```

The CLI prints a render ID. Track progress:

```bash
bunx remotion lambda progress <bucket-name> <render-id>
```

## Programmatic render

```tsx
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';

const { renderId, bucketName } = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render-...',
  serveUrl: 'https://remotionlambda-....s3.amazonaws.com/sites/my-project/index.html',
  composition: 'my-video',
  inputProps: { title: 'Hello' },
  codec: 'h264',
  privacy: 'private',
});

while (true) {
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    functionName: 'remotion-render-...',
    region: 'us-east-1',
  });
  if (progress.done) {
    console.log('Output:', progress.outputFile);
    break;
  }
  if (progress.fatalErrorEncountered) throw new Error(progress.errors[0]?.message);
  await new Promise((r) => setTimeout(r, 1000));
}
```

## Constraints

- **No AV1 on Lambda** — use h264, h265, vp8, vp9, or prores.
- Render length is bounded by ephemeral disk, which defaults to 2048MB on Remotion 4.x — roughly 32 min at 1080p. Raise it with `--disk` (or `diskSizeInMb`) up to the 10GB AWS cap, which buys ~2h40m at 1080p. <!-- public issue #1764, #1760, @jacobo-ortiz -->
- Max 200 concurrent Lambda functions per render (hard cap).
- Default 1000 concurrent Lambda per region per account (requestable higher from AWS).
- Licensing is by organization size, not by Lambda usage: the Free License covers individuals, non-profits and for-profit orgs with up to 3 employees, commercial use included. Above that, a Company License from remotion.pro. <!-- public issue #1753, @jacobo-ortiz -->

## When to use Lambda vs local

- **Local:** iteration, previews, single videos, non-time-critical work.
- **Lambda:** batch pipelines, production, turning 10-minute renders into 30-second renders, overnight jobs.

## Reference

- Docs: https://www.remotion.dev/docs/lambda
- Cost example: https://www.remotion.dev/docs/lambda/cost-example <!-- public issue #1753, @jacobo-ortiz — /lambda/pricing 404s -->
- Optimizing cost: https://www.remotion.dev/docs/lambda/optimizing-cost
- Disk size and max video length: https://www.remotion.dev/docs/lambda/disk-size
- IAM policy: https://www.remotion.dev/docs/lambda/permissions

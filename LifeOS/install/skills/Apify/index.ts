/**
 * Apify Code-First Interface
 *
 * Replaces token-heavy MCP calls with direct code execution.
 * Enables in-code filtering and control flow for massive token savings.
 */

import { ApifyClient } from 'apify-client'
import type {
  ActorRun as ApifyActorRun,
  ActorStoreList
} from 'apify-client'
import type { ActorRunOptions } from './types'

export type Actor = ActorStoreList
export type ActorRun = ApifyActorRun

export interface DatasetOptions {
  offset?: number
  limit?: number
  fields?: string[]
  omit?: string[]
  clean?: boolean
}

/**
 * Main Apify client for code-first operations
 */
export class Apify {
  private client: ApifyClient

  constructor(token?: string) {
    this.client = new ApifyClient({
      token: token || process.env.APIFY_TOKEN || process.env.APIFY_API_KEY
    })
  }

  /**
   * Search for actors by keyword
   *
   * @param query - Search query (actor name, description, etc.)
   * @param options - Search options
   * @returns Array of matching actors
   */
  async search(query: string, options?: {
    limit?: number
    offset?: number
  }): Promise<Actor[]> {
    const { items } = await this.client.store().list({
      search: query,
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0
    })

    return items
  }

  /**
   * Call (execute) an actor
   *
   * @param actorId - Actor ID or "username/actor-name"
   * @param input - Actor input configuration
   * @param options - Runtime and charge-limit options
   * @returns Actor run information
   */
  async callActor(
    actorId: string,
    input: any,
    options?: ActorRunOptions
  ): Promise<ActorRun> {
    const run = await this.client.actor(actorId).call(input, {
      memory: options?.memory,
      timeout: options?.timeout,
      build: options?.build,
      waitSecs: options?.waitSecs,
      maxTotalChargeUsd: options?.maxTotalChargeUsd
    })

    return run
  }

  /**
   * Get dataset interface for reading and filtering data
   *
   * @param datasetId - Dataset ID from actor run
   * @returns ApifyDataset instance
   */
  getDataset(datasetId: string): ApifyDataset {
    return new ApifyDataset(this.client, datasetId)
  }

  /**
   * Get actor run status
   *
   * @param runId - Run ID
   * @returns Run information
   */
  async getRun(runId: string): Promise<ActorRun> {
    const run = await this.client.run(runId).get()
    if (!run) {
      throw new Error(`Actor run ${runId} not found. Verify the run ID.`)
    }
    return run
  }

  /**
   * Wait for actor run to finish
   *
   * @param runId - Run ID
   * @param options - Wait options
   * @returns Final run information
   */
  async waitForRun(
    runId: string,
    options?: {
      waitSecs?: number
    }
  ): Promise<ActorRun> {
    const run = await this.client.run(runId).waitForFinish({
      waitSecs: options?.waitSecs
    })
    return run
  }
}

/**
 * Dataset interface for reading and filtering data
 *
 * KEY FEATURE: Filter data in code BEFORE returning to model context
 * This is where the massive token savings happen!
 */
export class ApifyDataset {
  constructor(
    private client: ApifyClient,
    private datasetId: string
  ) {}

  /**
   * List dataset items
   *
   * @param options - List options (pagination, fields)
   * @returns Array of dataset items
   */
  async listItems(options?: DatasetOptions): Promise<any[]> {
    const { items } = await this.client.dataset(this.datasetId).listItems({
      offset: options?.offset,
      limit: options?.limit,
      fields: options?.fields,
      omit: options?.omit,
      clean: options?.clean
    })

    return items
  }

  /**
   * Get all dataset items (handles pagination automatically)
   *
   * WARNING: For large datasets, use listItems with limit
   * or filter in code to avoid excessive tokens
   *
   * @returns Array of all items
   */
  async getAllItems(): Promise<any[]> {
    const allItems: any[] = []
    let offset = 0
    const limit = 1000

    while (true) {
      const { items, count, total } = await this.client.dataset(this.datasetId).listItems({
        offset,
        limit
      })

      allItems.push(...items)

      if (offset + count >= total) break
      offset += limit
    }

    return allItems
  }

  /**
   * Helper: Filter items by predicate function
   *
   * This is a convenience method - you can also filter
   * using standard array methods after listItems()
   *
   * @param predicate - Filter function
   * @returns Filtered items
   */
  async filter(predicate: (item: any) => boolean): Promise<any[]> {
    const items = await this.getAllItems()
    return items.filter(predicate)
  }

  /**
   * Helper: Get top N items by sort function
   *
   * @param sortFn - Sort comparison function
   * @param limit - Number of items to return
   * @returns Top N sorted items
   */
  async top(sortFn: (a: any, b: any) => number, limit: number): Promise<any[]> {
    const items = await this.getAllItems()
    return items.sort(sortFn).slice(0, limit)
  }
}

// Re-export for convenience
export { ApifyClient }

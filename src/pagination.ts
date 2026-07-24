import { WebshareError } from './error.js';

/** The standard Webshare list envelope: `{count, next, previous, results}`. */
export interface PageEnvelope<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * A single page of results.
 *
 * Exposes the raw envelope (`results`, `count`, `next`, `previous`) and
 * implements `AsyncIterable<T>`: iterating a page yields every item across all
 * subsequent pages by following the envelope's `next` URL verbatim.
 *
 * Works for both server pagination variants (`page`/`page_size` and
 * `starting_after`/`page_size`).
 */
export class Page<T> implements AsyncIterable<T> {
  readonly results: T[];
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;

  #fetchURL: (url: string) => Promise<PageEnvelope<T>>;

  constructor(fetchURL: (url: string) => Promise<PageEnvelope<T>>, envelope: PageEnvelope<T>) {
    this.#fetchURL = fetchURL;
    this.results = envelope.results ?? [];
    this.count = envelope.count;
    this.next = envelope.next ?? null;
    this.previous = envelope.previous ?? null;
  }

  /** Whether the server reported a further page. */
  hasNextPage(): boolean {
    return this.next !== null;
  }

  /**
   * Fetches the next page by requesting the envelope's `next` URL verbatim.
   * Throws if there is no next page; check {@link hasNextPage} first.
   */
  async nextPage(): Promise<Page<T>> {
    if (this.next === null) {
      throw new WebshareError('No next page available; call hasNextPage() before nextPage().');
    }
    const envelope = await this.#fetchURL(this.next);
    return new Page(this.#fetchURL, envelope);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let page: Page<T> = this;
    for (;;) {
      for (const item of page.results) {
        yield item;
      }
      if (!page.hasNextPage()) return;
      page = await page.nextPage();
    }
  }
}

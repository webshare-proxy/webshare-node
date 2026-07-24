import { once } from 'node:events';
import { createServer, type Server, type ServerResponse } from 'node:http';

export interface RecordedRequest {
  method: string;
  /** Path + query string, e.g. `/api/v2/proxy/list/?mode=direct`. */
  url: string;
  headers: NodeJS.Dict<string | string[]>;
  body: string;
}

export type Responder = (req: RecordedRequest, res: ServerResponse) => void;

/** A local HTTP fixture server that records requests and replays canned responses. */
export class TestServer {
  readonly requests: RecordedRequest[] = [];
  url = '';

  #queue: Responder[] = [];
  #fallback: Responder = (_req, res) => {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ detail: 'Not found.' }));
  };
  #server: Server;

  constructor() {
    this.#server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const recorded: RecordedRequest = {
          method: req.method ?? '',
          url: req.url ?? '',
          headers: req.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        };
        this.requests.push(recorded);
        const responder = this.#queue.shift() ?? this.#fallback;
        responder(recorded, res);
      });
    });
  }

  async start(): Promise<this> {
    this.#server.listen(0, '127.0.0.1');
    await once(this.#server, 'listening');
    const address = this.#server.address();
    if (address === null || typeof address === 'string') throw new Error('unexpected server address');
    this.url = `http://127.0.0.1:${address.port}`;
    return this;
  }

  /** Enqueues one-shot responders, consumed in request order. */
  respond(...responders: Responder[]): void {
    this.#queue.push(...responders);
  }

  /** Clears recorded requests and any leftover queued responders. */
  reset(): void {
    this.requests.length = 0;
    this.#queue.length = 0;
  }

  /** Sets the fallback responder used when the queue is empty. */
  onRequest(responder: Responder): void {
    this.#fallback = responder;
  }

  get lastRequest(): RecordedRequest {
    const last = this.requests[this.requests.length - 1];
    if (last === undefined) throw new Error('no requests were recorded');
    return last;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.#server.close((err) => (err !== undefined && err !== null ? reject(err) : resolve()));
    });
  }
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Responder {
  return (_req, res) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };
}

export function text(status: number, body: string, headers: Record<string, string> = {}): Responder {
  return (_req, res) => {
    res.writeHead(status, { 'content-type': 'text/plain', ...headers });
    res.end(body);
  };
}

export function empty(status: number, headers: Record<string, string> = {}): Responder {
  return (_req, res) => {
    res.writeHead(status, headers);
    res.end();
  };
}

/** A paginated envelope responder. */
export function page(results: unknown[], opts: { count?: number; next?: string | null; previous?: string | null } = {}): Responder {
  return json(200, {
    count: opts.count ?? results.length,
    next: opts.next ?? null,
    previous: opts.previous ?? null,
    results,
  });
}

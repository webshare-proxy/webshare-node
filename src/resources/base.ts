import type { Webshare } from '../client.js';

/** Base class for API resource groups. */
export class APIResource {
  protected readonly _client: Webshare;

  constructor(client: Webshare) {
    this._client = client;
  }
}

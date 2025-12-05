/// <reference types="@cloudflare/workers-types" />
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

interface Env {
  SECRET_KEY: string;
  INFURA_API_KEY: string;
  INFURA_API_KEY_SECRET: string;
}

interface ResolveResponse {
  name: string;
  address: string | null;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const auth = request.headers.get('X-API-Key');
    if (auth !== env.SECRET_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    let name: string | undefined;

    if (request.method === 'GET') {
      name = new URL(request.url).searchParams.get("name") ?? ''
    } else {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!name || typeof name !== 'string') {
      return new Response('Missing ens', { status: 400 });
    }

    const normalized = normalize(name.toLowerCase().trim());

    const client = createPublicClient({
      chain: mainnet,
      transport: http(`https://mainnet.infura.io/v3/${env.INFURA_API_KEY}`, {
        fetchOptions: {
          headers: {
            'Authorization': `Basic ${btoa(`${env.INFURA_API_KEY}:${env.INFURA_API_KEY_SECRET}`)}`
          }
        }
      }),
    });

    try {
      const address = await client.getEnsAddress({ name: normalized });

      console.log(`normalized: ${normalized}`);
      console.log(`address: ${address}`);

      const result: ResolveResponse = { name: normalized, address: address ?? null };

      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 500 });
    }
  },
};

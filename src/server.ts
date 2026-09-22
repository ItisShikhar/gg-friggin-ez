import { ToxScreener, legacyKeywordFilter } from './index.ts';
import { PRESET_COMMENTS } from './demo/presets.ts';
import { evaluateWithOpenAi } from './demo/openaiCompare.ts';
import type { ServerWebSocket } from 'bun';

const screener = new ToxScreener();
// Tracked locally (not via a public ToxScreener.getApiKey() getter, which
// would expose the secret to any library consumer) purely so this demo
// server can forward the same key to the OpenAI comparison endpoint.
let currentApiKey =
  process.env.OPENROUTER_API_KEY || process.env.TYPESAFE_API_KEY || process.env.JEV_KEY || '';

const PORT = Number(process.env.PORT || 3000);

interface ClientData {
  id: string;
  mode: 'twitch' | 'valorant';
}

const connectedSockets = new Set<ServerWebSocket<ClientData>>();

const server = Bun.serve<ClientData>({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade WebSocket
    if (url.pathname === '/ws') {
      const mode = (url.searchParams.get('mode') as 'twitch' | 'valorant') || 'twitch';
      const upgraded = server.upgrade(req, {
        data: {
          id: Math.random().toString(36).substring(2, 9),
          mode,
        },
      });
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // CORS headers for local testing
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (url.pathname === '/api/health') {
      return Response.json(
        {
          status: 'ok',
          model: screener.getModelName(),
          hasApiKey: screener.hasApiKey(),
          presetsCount: PRESET_COMMENTS.length,
          timestamp: new Date().toISOString(),
        },
        { headers: corsHeaders }
      );
    }

    if (url.pathname === '/api/presets') {
      const category = url.searchParams.get('category');
      const filtered = category
        ? PRESET_COMMENTS.filter((p) => p.category === category || p.category === 'all')
        : PRESET_COMMENTS;
      return Response.json({ presets: filtered }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/screen' && req.method === 'POST') {
      try {
        const body = (await req.json()) as { text?: string };
        const text = body.text || '';
        const result = await screener.screen(text);
        return Response.json(result, { headers: corsHeaders });
      } catch (err: any) {
        return Response.json(
          { error: err?.message || 'Failed to screen text' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Side-by-side comparison: legacy keyword filter vs Jev decision engine
    if (url.pathname === '/api/compare' && req.method === 'POST') {
      try {
        const body = (await req.json()) as {
          text?: string;
          expectedAbusive?: boolean;
        };
        const text = body.text || '';

        const legacyStart = performance.now();
        const legacy = legacyKeywordFilter(text);
        const legacyLatencyMs = Math.max(1, Math.round(performance.now() - legacyStart));

        const [jev, openai] = await Promise.all([
          screener.screen(text),
          evaluateWithOpenAi(text, currentApiKey, body.expectedAbusive),
        ]);

        // Legacy is a blunt binary tool: it's either right or a silent failure
        // (false positive over-block or false negative miss).
        let legacyOutcome: 'correct' | 'wrong' | 'unscored' = 'unscored';
        if (typeof body.expectedAbusive === 'boolean') {
          legacyOutcome = (legacy.isProfane || legacy.isToxic) === body.expectedAbusive ? 'correct' : 'wrong';
        }

        // Jev gets credit for routing genuinely uncertain calls to human review
        // instead of confidently guessing wrong — that calibrated honesty is
        // the point, not just raw accuracy.
        let jevOutcome: 'correct' | 'uncertain_routed' | 'wrong' | 'unscored' = 'unscored';
        if (typeof body.expectedAbusive === 'boolean') {
          const isHarmful = jev.isProfane || jev.isToxic;
          if (isHarmful === body.expectedAbusive) {
            jevOutcome = 'correct';
          } else if (jev.action === 'SUSPICIOUS_REVIEW') {
            jevOutcome = 'uncertain_routed';
          } else {
            jevOutcome = 'wrong';
          }
        }

        return Response.json(
          {
            text,
            legacy: { ...legacy, latencyMs: legacyLatencyMs, costUsd: 0, outcome: legacyOutcome },
            jev: { ...jev, outcome: jevOutcome },
            openai,
          },
          { headers: corsHeaders }
        );
      } catch (err: any) {
        return Response.json(
          { error: err?.message || 'Failed to compare text' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (url.pathname === '/api/config' && req.method === 'POST') {
      try {
        const body = (await req.json()) as { apiKey?: string };
        if (typeof body.apiKey === 'string') {
          screener.setApiKey(body.apiKey);
          currentApiKey = body.apiKey.trim();
        }
        return Response.json(
          {
            ok: true,
            model: screener.getModelName(),
            hasApiKey: screener.hasApiKey(),
          },
          { headers: corsHeaders }
        );
      } catch (err: any) {
        return Response.json({ error: err?.message }, { status: 400, headers: corsHeaders });
      }
    }

    // Static files from /demo
    let filePath = url.pathname;
    if (filePath === '/') filePath = '/index.html';

    let localPath = `./demo${filePath}`;
    let file = Bun.file(localPath);
    if (!(await file.exists())) {
      if (filePath === '/valorant-headshot.png') {
        localPath = `./demo/images/valorant-headshot.png`;
        file = Bun.file(localPath);
      } else if (filePath.startsWith('/images/')) {
        localPath = `./demo/images${filePath.replace('/images', '')}`;
        file = Bun.file(localPath);
      }
    }

    if (await file.exists()) {
      let contentType = 'text/plain';
      if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
      else if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';
      else if (filePath.endsWith('.js')) contentType = 'application/javascript; charset=utf-8';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (filePath.endsWith('.png')) contentType = 'image/png';

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
  websocket: {
    open(ws) {
      connectedSockets.add(ws);
    },
    message(ws, message) {
      try {
        const data = JSON.parse(String(message));
        if (data.type === 'chat_message') {
          // Broadcast to clients in same mode
          for (const client of connectedSockets) {
            if (client !== ws && client.data.mode === ws.data.mode) {
              client.send(JSON.stringify(data));
            }
          }
        }
      } catch (e) {
        // ignore malformed
      }
    },
    close(ws) {
      connectedSockets.delete(ws);
    },
  },
});

console.log(`🚀 gg-friggin-ez demo server running at http://localhost:${server.port}`);

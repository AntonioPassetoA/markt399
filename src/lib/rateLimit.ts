// Rate limiter simples em memória (janela fixa por chave, normalmente o IP).
// Adequado para um único processo (PM2/Nginx). Para múltiplas instâncias,
// trocar por um store compartilhado (ex.: Redis/Upstash).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpeza preguiçosa: remove buckets expirados de tempos em tempos para não
// crescer indefinidamente em memória.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Verifica e contabiliza uma requisição para `key`.
 * @param key   identificador (normalmente o IP do cliente)
 * @param limit número máximo de requisições permitidas na janela
 * @param windowMs tamanho da janela em milissegundos
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Extrai o IP do cliente a partir dos headers (atrás do Nginx/proxy).
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

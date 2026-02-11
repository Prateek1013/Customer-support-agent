import type { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface ClientData {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, ClientData>();

export const rateLimiter = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const finalIp = ip.split(',')[0].trim(); // Handle multiple IPs if behind proxy
    
    // Skip rate limiting for unknown IPs if deemed safe or handle appropriately
    // For now, treat 'unknown' as a single client
    
    const now = Date.now();
    
    let clientData = rateLimitStore.get(finalIp);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(finalIp, clientData);
    }
    
    clientData.count++;
    
    const remaining = Math.max(0, config.max - clientData.count);
    const resetTime = Math.ceil((clientData.resetTime - now) / 1000); // Seconds until reset

    // Set standard RateLimit headers
    c.header('X-RateLimit-Limit', config.max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetTime.toString());
    
    if (clientData.count > config.max) {
      return c.json({ error: 'Too Many Requests' }, 429);
    }
    
    await next();
  };
};

import { ConfigService } from '@nestjs/config';
import { RedisStore } from 'connect-redis';
import type { RequestHandler } from 'express';
import session from 'express-session';
import { createClient } from 'redis';

type SessionStore = session.Store | undefined;

/**
 * Builds express-session middleware.
 * Use SESSION_STORE=memory for local development without Redis/Docker.
 * Use SESSION_STORE=redis (default) for Redis-backed sessions.
 */
export async function createSessionMiddleware(
  config: ConfigService,
): Promise<RequestHandler> {
  const storeMode = (
    config.get<string>('SESSION_STORE') ?? 'redis'
  ).toLowerCase();
  const maxAge = Number(config.get<string>('SESSION_MAX_AGE', '86400000'));

  let store: SessionStore;

  if (storeMode === 'memory') {
    console.warn(
      '[session] Using in-memory store (SESSION_STORE=memory). Not for production.',
    );
    store = new session.MemoryStore();
  } else {
    const redisPassword = config.get<string>('REDIS_PASSWORD');
    const redisClient = createClient({
      socket: {
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(config.get<string>('REDIS_PORT', '6379')),
      },
      password: redisPassword ? redisPassword : undefined,
    });

    redisClient.on('error', (error: Error) => {
      console.error('[redis] session store error:', error.message);
    });

    await redisClient.connect();

    store = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 86_400,
    });
  }

  return session({
    store,
    name: config.get<string>('SESSION_NAME', 'sid'),
    secret: config.getOrThrow<string>('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge,
    },
  });
}

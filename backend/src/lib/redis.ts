import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { config } from '../config';

let redisInstance: Redis | null = null;
let memoryServer: RedisMemoryServer | null = null;

let currentHost = config.REDIS_HOST;
let currentPort = config.REDIS_PORT;

export async function getRedisConnection(): Promise<{ redis: Redis; host: string; port: number }> {
  if (redisInstance && redisInstance.status === 'ready') {
    return { redis: redisInstance, host: currentHost, port: currentPort };
  }

  // 1. Try connecting to external Redis
  try {
    const testRedis = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      connectTimeout: 1500,
      retryStrategy: () => null,
      lazyConnect: true
    });

    await testRedis.connect();
    console.log(`[Redis] Successfully connected to external Redis at ${config.REDIS_HOST}:${config.REDIS_PORT}`);
    redisInstance = testRedis;
    currentHost = config.REDIS_HOST;
    currentPort = config.REDIS_PORT;
    return { redis: redisInstance, host: currentHost, port: currentPort };
  } catch (err: any) {
    console.log(`[Redis] External Redis at ${config.REDIS_HOST}:${config.REDIS_PORT} not found. Launching embedded Redis...`);
  }

  // 2. Launch embedded Redis instance
  try {
    memoryServer = new RedisMemoryServer();
    const host = await memoryServer.getHost();
    const port = await memoryServer.getPort();
    currentHost = host;
    currentPort = port;

    redisInstance = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    console.log(`[Redis] Embedded Redis server started and ready at ${host}:${port}`);
    return { redis: redisInstance, host, port };
  } catch (memErr: any) {
    console.error('[Redis] Failed to start embedded Redis:', memErr);
    throw memErr;
  }
}

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: currentHost,
      port: currentPort,
      maxRetriesPerRequest: null,
    });
  }
  return redisInstance;
}

import { jest } from '@jest/globals';
import type { RedisService } from '../infrastructure/redis.service';
import { PackageCacheService } from './package-cache.service';

describe('PackageCacheService', () => {
  function createService() {
    const client = {
      get: jest
        .fn<(key: string) => Promise<string | null>>()
        .mockResolvedValue(null),
      set: jest
        .fn<(...args: (string | number)[]) => Promise<string>>()
        .mockResolvedValue('OK'),
      incr: jest.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
    };
    const service = new PackageCacheService({
      client,
    } as unknown as RedisService);
    return { service, client };
  }

  it('uses version zero when no cache version exists', async () => {
    const { service } = createService();

    await expect(service.getVersion()).resolves.toBe('0');
  });

  it('returns the current version and reads cached JSON values', async () => {
    const { service, client } = createService();
    client.get.mockResolvedValueOnce('12').mockResolvedValueOnce('{"total":2}');

    await expect(service.getVersion()).resolves.toBe('12');
    await expect(
      service.get<{ total: number }>('query', '12'),
    ).resolves.toEqual({
      total: 2,
    });
  });

  it('returns undefined for missing or malformed cached values', async () => {
    const { service, client } = createService();
    client.get.mockResolvedValueOnce(null).mockResolvedValueOnce('{bad json');

    await expect(service.get('missing', '0')).resolves.toBeUndefined();
    await expect(service.get('invalid', '0')).resolves.toBeUndefined();
  });

  it('stores values with the configured TTL and increments the cache version', async () => {
    const { service, client } = createService();

    await service.set('query', '2', { total: 1 });
    expect(client.set).toHaveBeenCalledWith(
      'packages:list:2:query',
      '{"total":1}',
      'EX',
      60,
    );
    await service.invalidate();
    expect(client.incr).toHaveBeenCalledWith('packages:list:version');
  });

  it('falls back to a cache miss when Redis reads, writes, or invalidation fail', async () => {
    const { service, client } = createService();
    client.get.mockRejectedValue(new Error('Redis offline'));
    client.set.mockRejectedValue(new Error('Redis offline'));
    client.incr.mockRejectedValue(new Error('Redis offline'));

    await expect(service.getVersion()).resolves.toBe('0');
    await expect(service.get('query', '0')).resolves.toBeUndefined();
    await expect(service.set('query', '0', {})).resolves.toBeUndefined();
    await expect(service.invalidate()).resolves.toBeUndefined();
  });
});

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

it('loads dotenv syntax while preserving existing environment variables', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'print-it-dotenv-'));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory);
  try {
    writeFileSync(
      join(directory, '.env'),
      [
        'DB_PASSWORD="fixture#password=with spaces" # password comment',
        'DB_PORT=5433 # use an alternate port',
        'DB_USERNAME=file_user',
      ].join('\n'),
    );

    vi.stubEnv('DB_PASSWORD', undefined);
    vi.stubEnv('DB_PORT', undefined);
    vi.stubEnv('DB_USERNAME', 'inherited_user');

    const { default: dataSource } = await import('./data-source.js');
    const { options } = dataSource;
    if (options.type !== 'postgres') throw new Error('Expected PostgreSQL');

    expect(options.password === 'fixture#password=with spaces').toBe(true);
    expect(options.port).toBe(5433);
    expect(options.username).toBe('inherited_user');
  } finally {
    cwd.mockRestore();
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  }
});

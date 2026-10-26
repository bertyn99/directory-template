// test/helpers/drizzle-mock.ts
// Utilities for mocking Drizzle ORM query chains in unit tests.
// Inspired by vitest-drizzle-mock patterns — no real DB needed.

import { vi } from 'vitest'

/**
 * Creates a mock Drizzle query chain that supports method chaining
 * (.select().from().where().limit() etc.) and resolves with the given value.
 *
 * Usage:
 *   const mockDb = createDrizzleChainMock([{ id: 1, name: 'Test' }])
 *   vi.mocked(useDrizzle).mockReturnValue(mockDb)
 *   // Now any Drizzle query on mockDb will resolve to [{ id: 1, name: 'Test' }]
 */
export function createDrizzleChainMock(resolveValue: unknown) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Make the chain thenable so `await` works
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
          Promise.resolve(resolveValue).then(resolve, reject)
        }
      }
      // Return a proxy that continues the chain for any method call
      return (..._args: unknown[]) => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler) as Record<string, unknown>
}

/**
 * Creates a mock Drizzle instance with typed query stubs.
 * Each table gets a vi.fn() that you can control per-test.
 *
 * Usage:
 *   const mockDb = createMockDb()
 *   mockDb.query.venues.findMany.mockResolvedValue([{ id: 1, name: 'Test' }])
 *   mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }) })
 */
export function createMockDb() {
  // Stable mock references for the insert chain so callers can configure them
  const insertReturningMock = vi.fn()
  const insertValuesMock = vi.fn().mockReturnValue({ returning: insertReturningMock })
  const insertMock = vi.fn().mockReturnValue({ values: insertValuesMock })

  // Stable mock references for the update chain
  const updateReturningMock = vi.fn()
  const updateSetMock = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ returning: updateReturningMock }),
    returning: updateReturningMock,
  })
  const updateMock = vi.fn().mockReturnValue({ set: updateSetMock })

  // Stable mock references for the delete chain
  const deleteWhereMock = vi.fn().mockReturnValue({ returning: vi.fn() })
  const deleteMock = vi.fn().mockReturnValue({ where: deleteWhereMock })

  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: insertMock,
    values: insertValuesMock,
    returning: insertReturningMock,
    update: updateMock,
    set: updateSetMock,
    delete: deleteMock,
    query: {} as Record<string, { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> }>,
    execute: vi.fn(),
    run: vi.fn(),
    // Expose stable mocks for per-test configuration
    insertReturningMock,
    updateReturningMock,
  }
}

/**
 * Sets up mock query.findMany for a given table name.
 */
export function mockTableQuery(mockDb: ReturnType<typeof createMockDb>, tableName: string) {
  mockDb.query[tableName] = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  }
  return mockDb.query[tableName]
}

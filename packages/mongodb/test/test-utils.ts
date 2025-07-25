import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

export interface TestDatabase {
  client: MongoClient
  cleanup: () => Promise<void>
}

/**
 * Creates a test database connection.
 * In CI, uses the real MongoDB service.
 * Locally, uses mongodb-memory-server.
 */
export async function createTestDatabase(dbName = 'test'): Promise<TestDatabase> {
  if (process.env.CI === 'true') {
    // In CI, use the real MongoDB service
    const client = await MongoClient.connect('mongodb://localhost:27017/' + dbName)
    return {
      client,
      cleanup: async () => {
        const db = client.db()
        await db.dropDatabase()
        await client.close()
      }
    }
  } else {
    // Locally, use mongodb-memory-server
    const mongod = await MongoMemoryServer.create({
      binary: {
        version: '8.0.0'
      }
    })
    const client = await MongoClient.connect(mongod.getUri())
    return {
      client,
      cleanup: async () => {
        await client.close()
        await mongod.stop()
      }
    }
  }
}

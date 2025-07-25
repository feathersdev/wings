export const connection = (DB: string, testName?: string) => {
  if (DB === 'mysql') {
    return {
      client: 'mysql2',
      connection: {
        host: 'localhost',
        port: 23306,
        user: 'mysql',
        password: 'mysql',
        database: 'feathers'
      }
    }
  }

  if (DB === 'postgres') {
    return {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        port: 15432,
        database: 'feathers',
        user: 'postgres',
        password: 'postgres'
      }
    }
  }

  return {
    client: 'better-sqlite3',
    connection: {
      filename: testName ? `./db-${testName}.sqlite` : './db.sqlite'
    },
    useNullAsDefault: true
  }
}

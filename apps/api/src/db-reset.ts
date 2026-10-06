import { loadEnv } from './env';
import { resetDatabase } from './reset';

// `pnpm db:reset`: fresh, migrated, seeded database.
const env = loadEnv(process.env);
const { edges } = await resetDatabase(env.DATABASE_URL, new Date(), env.NODE_ENV);
console.log(`Database reset and seeded (${edges} relations).`);

import { PgBoss } from 'pg-boss';
import type { CustomerId } from '@borneo/shared';
import type { OrderJobs } from '../modules/orders/index';

// pg-boss workers (ADR-0004): thin, they only call services. Jobs live in Postgres, so a hold
// still ends after a restart (D-57).

export const QUEUES = { holdExpiry: 'hold-expiry', latePayment: 'mock-late-payment' } as const;

type HoldJob = { customerId: CustomerId; orderId: string };
type LatePaymentJob = HoldJob & { attemptId: string };

export type JobHandlers = {
  expireHold: (job: HoldJob) => Promise<void>;
  latePayment: (job: LatePaymentJob) => Promise<void>;
};

/** Starts pg-boss on the app's database and returns the scheduler the orders service uses. */
export async function startJobs(databaseUrl: string) {
  const boss = new PgBoss({ connectionString: databaseUrl, schema: 'pgboss' });
  boss.on('error', (error) => console.error('pg-boss', error));
  await boss.start();
  for (const name of Object.values(QUEUES)) await boss.createQueue(name);

  const jobs: OrderJobs = {
    async holdExpiry(job, at) {
      await boss.send(QUEUES.holdExpiry, job, {
        startAfter: new Date(at),
        singletonKey: job.orderId,
      });
    },
    async latePayment(job, at) {
      await boss.send(QUEUES.latePayment, job, {
        startAfter: new Date(at),
        singletonKey: job.attemptId,
      });
    },
  };

  return {
    jobs,
    /** Registers the workers once the services exist. */
    async work(handlers: JobHandlers) {
      await boss.work<HoldJob>(QUEUES.holdExpiry, async ([job]) => {
        if (job) await handlers.expireHold(job.data);
      });
      await boss.work<LatePaymentJob>(QUEUES.latePayment, async ([job]) => {
        if (job) await handlers.latePayment(job.data);
      });
    },
    stop: () => boss.stop({ graceful: true }),
  };
}

/**
 * No background jobs (tests, scripts): holds still end, lazily, the next time the order is read
 * or paid (D-57).
 */
export const noJobs: OrderJobs = {
  holdExpiry: async () => {},
  latePayment: async () => {},
};

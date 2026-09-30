import { Prisma } from '@prisma/client';

export async function enqueueOutbox(db: Prisma.TransactionClient, type: string, payload: unknown) {
  await db.integrationJob.create({
    data: { type, payload: JSON.stringify(payload), status: 'PENDING' },
  });
}

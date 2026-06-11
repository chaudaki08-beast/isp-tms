import type { Prisma, PrismaClient } from '@prisma/client';
import { InvoiceStatus } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Generate the next sequential invoice number for the current year,
 * formatted INV-YYYY-NNNN. Call inside a transaction to reduce races.
 */
export async function nextInvoiceNumber(tx: Tx, year: number): Promise<string> {
  const prefix = `INV-${year}-`;
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

/** Derive the invoice status from totals + due date. */
export function deriveStatus(total: number, paid: number, dueDate: Date): InvoiceStatus {
  if (paid >= total && total > 0) return InvoiceStatus.PAID;
  if (paid > 0 && paid < total) return InvoiceStatus.PARTIAL;
  if (paid <= 0 && dueDate < new Date()) return InvoiceStatus.OVERDUE;
  return InvoiceStatus.PENDING;
}

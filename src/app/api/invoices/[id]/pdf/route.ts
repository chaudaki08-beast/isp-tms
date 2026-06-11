import { NextResponse } from 'next/server';
import { handle } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const money = (v: unknown) => `₹${Number(v).toFixed(2)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Returns a print-ready HTML invoice. The browser opens it and the user can
 * "Print → Save as PDF" (also auto-triggers the print dialog). Keeps the
 * deployment serverless-friendly without a heavy PDF binary.
 */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const inv = await prisma.invoice.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: { items: true, customer: true },
  });

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ISP Management';
  const rows = inv.items
    .map(
      (it) => `<tr>
        <td>${esc(it.description)}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td style="text-align:right">${money(it.unitPrice)}</td>
        <td style="text-align:right">${money(it.amount)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Invoice ${esc(inv.number)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:system-ui,Arial,sans-serif;color:#0f172a;max-width:800px;margin:24px auto;padding:0 24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2563eb;padding-bottom:16px}
    h1{margin:0;color:#2563eb;font-size:22px} .muted{color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:24px} th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px}
    th{background:#f1f5f9;text-align:left} .totals{margin-top:16px;float:right;width:260px}
    .totals div{display:flex;justify-content:space-between;padding:4px 0} .grand{font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:6px;padding-top:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#dbeafe;color:#1d4ed8}
    .btn{margin:24px 0;padding:10px 16px;background:#2563eb;color:#fff;border:0;border-radius:8px;cursor:pointer}
    @media print{.btn{display:none}}
  </style></head><body>
    <div class="head">
      <div><h1>${esc(appName)}</h1><div class="muted">Tax Invoice</div></div>
      <div style="text-align:right">
        <div style="font-weight:700">${esc(inv.number)}</div>
        <div class="muted">Issued: ${inv.issueDate.toISOString().slice(0, 10)}</div>
        <div class="muted">Due: ${inv.dueDate.toISOString().slice(0, 10)}</div>
        <div style="margin-top:6px"><span class="badge">${inv.status}</span></div>
      </div>
    </div>
    <div style="margin-top:16px">
      <div class="muted">Billed To</div>
      <div style="font-weight:600">${esc(inv.customer.name)} (${esc(inv.customer.code)})</div>
      <div class="muted">${esc(inv.customer.address)}</div>
      <div class="muted">${esc(inv.customer.mobile)}${inv.customer.email ? ' · ' + esc(inv.customer.email) : ''}</div>
    </div>
    <table>
      <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
      <div><span>Tax</span><span>${money(inv.tax)}</span></div>
      <div class="grand"><span>Total</span><span>${money(inv.total)}</span></div>
      <div><span>Paid</span><span>${money(inv.amountPaid)}</span></div>
      <div><span>Balance</span><span>${money(Number(inv.total) - Number(inv.amountPaid))}</span></div>
    </div>
    <div style="clear:both"></div>
    ${inv.notes ? `<p class="muted">${esc(inv.notes)}</p>` : ''}
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
  </body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});

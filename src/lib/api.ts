import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/rbac';

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  return NextResponse.json({ success: true, data }, responseInit);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(extra ? { errors: extra } : {}) },
    { status }
  );
}

/**
 * Wrap a route handler so thrown ApiError / ZodError / Prisma errors are
 * converted into clean JSON responses instead of 500 stack traces.
 */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return fail(err.status, err.message);
      }
      if (err instanceof ZodError) {
        return fail(422, 'Validation failed', err.flatten().fieldErrors);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          return fail(409, 'A record with this value already exists.');
        }
        if (err.code === 'P2025') {
          return fail(404, 'Record not found.');
        }
      }
      console.error('[API ERROR]', err);
      return fail(500, 'Internal server error.');
    }
  };
}

/** Parse standard list query params: page, perPage, search, sort. */
export function parseListQuery(url: string) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage') || 20)));
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status') || undefined;
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
  return { page, perPage, search, status, sort, order, skip: (page - 1) * perPage, take: perPage };
}

export function paginated<T>(items: T[], total: number, page: number, perPage: number) {
  return {
    items,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
    },
  };
}

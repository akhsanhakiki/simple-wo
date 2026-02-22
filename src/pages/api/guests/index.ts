import type { APIRoute } from 'astro';
import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { guestGroups, guests } from '../../../lib/db/schema';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

function parseNum(value: string | undefined, defaultVal: number): number {
	if (value === undefined) return defaultVal;
	const n = parseInt(value, 10);
	return Number.isNaN(n) || n < 1 ? defaultVal : Math.min(n, MAX_LIMIT);
}

export const GET: APIRoute = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const page = Math.max(1, parseNum(url.searchParams.get('page') ?? undefined, 1));
		const limit = parseNum(url.searchParams.get('limit') ?? undefined, DEFAULT_LIMIT);
		const search = (url.searchParams.get('search') ?? '').trim();
		const location = (url.searchParams.get('location') ?? '').trim();
		const invitationType = (url.searchParams.get('invitationType') ?? '').trim();
		const guestGroup = (url.searchParams.get('guestGroup') ?? '').trim();
		const guestType = (url.searchParams.get('guestType') ?? '').trim();

		const conditions = [];
		if (search) {
			const pattern = `%${search}%`;
			conditions.push(
				sql`(${guests.name} ILIKE ${pattern} OR COALESCE(${guests.address}, '')::text ILIKE ${pattern} OR COALESCE(${guests.weddingLocation}, '')::text ILIKE ${pattern})`,
			);
		}
		if (location) {
			conditions.push(eq(guests.weddingLocation, location));
		}
		if (invitationType) {
			conditions.push(eq(guests.invitationType, invitationType));
		}
		if (guestGroup) {
			conditions.push(eq(guests.guestGroup, guestGroup));
		}
		if (guestType === 'sekaliyan' || guestType === 'sendiri') {
			conditions.push(eq(guests.guestType, guestType));
		}
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const offset = (page - 1) * limit;

		const [filteredCountResult] = await db
			.select({ count: count() })
			.from(guests)
			.where(whereClause);
		const total = Number(filteredCountResult?.count ?? 0);

		const [totalAllResult] = await db
			.select({ count: count() })
			.from(guests);
		const totalAll = Number(totalAllResult?.count ?? 0);

		const locationRows = await db
			.select({ weddingLocation: guests.weddingLocation })
			.from(guests);
		const uniqueLocations = [
			...new Set(
				locationRows
					.map((r) => r.weddingLocation)
					.filter((loc): loc is string => loc != null && loc !== ''),
			),
		];

		const groupRows = await db.select({ name: guestGroups.name }).from(guestGroups).orderBy(guestGroups.name);
		const guestGroupNames = groupRows.map((r) => r.name);

		const data = await db
			.select()
			.from(guests)
			.where(whereClause)
			.orderBy(guests.guestGroup, guests.id)
			.limit(limit)
			.offset(offset);

		return new Response(
			JSON.stringify({ data, total, totalAll, uniqueLocations, guestGroupNames }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to fetch guests' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const POST: APIRoute = async ({ request }) => {
	if (request.headers.get('Content-Type')?.includes('application/json') !== true) {
		return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	let body: { name?: string; address?: string; weddingLocation?: string; invitationTime?: string; invitationType?: string; guestType?: string; guestGroup?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) {
		return new Response(JSON.stringify({ error: 'name is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const address = typeof body.address === 'string' ? body.address.trim() : null;
	const weddingLocation = typeof body.weddingLocation === 'string' ? body.weddingLocation.trim() || null : null;
	const invitationType = body.invitationType === 'physical' || body.invitationType === 'digital' ? body.invitationType : null;
	const guestType = body.guestType === 'sekaliyan' || body.guestType === 'sendiri' ? body.guestType : null;
	let guestGroup: string | null = typeof body.guestGroup === 'string' ? body.guestGroup.trim() || null : null;
	let invitationTime: Date | null = null;
	if (body.invitationTime != null) {
		const parsed = new Date(body.invitationTime);
		if (!Number.isNaN(parsed.getTime())) invitationTime = parsed;
	}
	try {
		if (guestGroup) {
			const [existing] = await db.select().from(guestGroups).where(eq(guestGroups.name, guestGroup));
			if (!existing) {
				await db.insert(guestGroups).values({ name: guestGroup }).onConflictDoNothing({ target: guestGroups.name });
			}
		}
		const [created] = await db
			.insert(guests)
			.values({ name, address, weddingLocation, invitationTime, invitationType, guestType, guestGroup })
			.returning();
		return new Response(JSON.stringify(created), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to create guest' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

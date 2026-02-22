import type { APIRoute } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { guests } from '../../../lib/db/schema';

const EXPORT_LIMIT = 5000;

export const GET: APIRoute = async ({ request }) => {
	try {
		const url = new URL(request.url);
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

		const data = await db
			.select()
			.from(guests)
			.where(whereClause)
			.orderBy(guests.guestGroup, guests.id)
			.limit(EXPORT_LIMIT);

		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to export guests' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

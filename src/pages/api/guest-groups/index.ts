import type { APIRoute } from 'astro';
import { count, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { guestGroups, guests } from '../../../lib/db/schema';

export const GET: APIRoute = async () => {
	try {
		const rows = await db
			.select({
				id: guestGroups.id,
				name: guestGroups.name,
				guestCount: count(guests.id),
			})
			.from(guestGroups)
			.leftJoin(guests, eq(guests.guestGroup, guestGroups.name))
			.groupBy(guestGroups.id, guestGroups.name)
			.orderBy(guestGroups.name);

		const data = rows.map((r) => ({
			id: r.id,
			name: r.name,
			guestCount: Number(r.guestCount),
		}));

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to fetch guest groups' }), {
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
	let body: { name?: string };
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
	try {
		const [created] = await db
			.insert(guestGroups)
			.values({ name })
			.returning();
		return new Response(JSON.stringify(created), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: unknown) {
		const message = err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505'
			? 'Nama grup sudah digunakan'
			: 'Failed to create guest group';
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

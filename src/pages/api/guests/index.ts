import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { guests } from '../../../lib/db/schema';

export const GET: APIRoute = async () => {
	try {
		const list = await db.select().from(guests);
		return new Response(JSON.stringify(list), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
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
	let body: { name?: string; address?: string; weddingLocation?: string; invitationTime?: string };
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
	let invitationTime: Date | null = null;
	if (body.invitationTime != null) {
		const parsed = new Date(body.invitationTime);
		if (!Number.isNaN(parsed.getTime())) invitationTime = parsed;
	}
	try {
		const [created] = await db
			.insert(guests)
			.values({ name, address, weddingLocation, invitationTime })
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

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { guests } from '../../../lib/db/schema';

function parseId(id: string): number | null {
	const n = parseInt(id, 10);
	return Number.isNaN(n) || n < 1 ? null : n;
}

export const GET: APIRoute = async ({ params }) => {
	const id = parseId(params.id ?? '');
	if (id === null) {
		return new Response(JSON.stringify({ error: 'Invalid id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const [guest] = await db.select().from(guests).where(eq(guests.id, id));
		if (!guest) {
			return new Response(JSON.stringify({ error: 'Guest not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify(guest), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to fetch guest' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const PUT: APIRoute = async ({ params, request }) => {
	const id = parseId(params.id ?? '');
	if (id === null) {
		return new Response(JSON.stringify({ error: 'Invalid id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (request.headers.get('Content-Type')?.includes('application/json') !== true) {
		return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	let body: { name?: string; address?: string; weddingLocation?: string; invitationTime?: string; invitationType?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const name = typeof body.name === 'string' ? body.name.trim() : undefined;
	if (name !== undefined && !name) {
		return new Response(JSON.stringify({ error: 'name cannot be empty' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const address = typeof body.address === 'string' ? body.address.trim() : undefined;
	const weddingLocation = body.weddingLocation !== undefined
		? (typeof body.weddingLocation === 'string' ? body.weddingLocation.trim() || null : null)
		: undefined;
	let invitationTime: Date | null | undefined = undefined;
	if (body.invitationTime !== undefined) {
		if (body.invitationTime == null || body.invitationTime === '') {
			invitationTime = null;
		} else {
			const parsed = new Date(body.invitationTime);
			invitationTime = Number.isNaN(parsed.getTime()) ? undefined : parsed;
		}
	}
	const invitationType = body.invitationType !== undefined
		? (body.invitationType === 'physical' || body.invitationType === 'digital' ? body.invitationType : null)
		: undefined;
	const updates: { name?: string; address?: string | null; weddingLocation?: string | null; invitationTime?: Date | null; invitationType?: string | null } = {};
	if (name !== undefined) updates.name = name;
	if (address !== undefined) updates.address = address;
	if (weddingLocation !== undefined) updates.weddingLocation = weddingLocation;
	if (invitationTime !== undefined) updates.invitationTime = invitationTime;
	if (invitationType !== undefined) updates.invitationType = invitationType;
	if (Object.keys(updates).length === 0) {
		const [existing] = await db.select().from(guests).where(eq(guests.id, id));
		if (!existing) {
			return new Response(JSON.stringify({ error: 'Guest not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify(existing), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const [updated] = await db
			.update(guests)
			.set(updates)
			.where(eq(guests.id, id))
			.returning();
		if (!updated) {
			return new Response(JSON.stringify({ error: 'Guest not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify(updated), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to update guest' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const DELETE: APIRoute = async ({ params }) => {
	const id = parseId(params.id ?? '');
	if (id === null) {
		return new Response(JSON.stringify({ error: 'Invalid id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const result = await db.delete(guests).where(eq(guests.id, id)).returning({ id: guests.id });
		if (result.length === 0) {
			return new Response(JSON.stringify({ error: 'Guest not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(null, { status: 204 });
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to delete guest' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

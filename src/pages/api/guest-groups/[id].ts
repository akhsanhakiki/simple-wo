import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { guestGroups, guests } from '../../../lib/db/schema';

function parseId(id: string): number | null {
	const n = parseInt(id, 10);
	return Number.isNaN(n) || n < 1 ? null : n;
}

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
	let body: { name?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const newName = typeof body.name === 'string' ? body.name.trim() : '';
	if (!newName) {
		return new Response(JSON.stringify({ error: 'name is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const [existing] = await db.select().from(guestGroups).where(eq(guestGroups.id, id));
		if (!existing) {
			return new Response(JSON.stringify({ error: 'Guest group not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const oldName = existing.name;
		await db.update(guestGroups).set({ name: newName }).where(eq(guestGroups.id, id));
		await db.update(guests).set({ guestGroup: newName }).where(eq(guests.guestGroup, oldName));
		const [updated] = await db.select().from(guestGroups).where(eq(guestGroups.id, id));
		return new Response(JSON.stringify(updated), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: unknown) {
		const message = err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505'
			? 'Nama grup sudah digunakan'
			: 'Failed to rename guest group';
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
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
		const [existing] = await db.select().from(guestGroups).where(eq(guestGroups.id, id));
		if (!existing) {
			return new Response(JSON.stringify({ error: 'Guest group not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		await db.update(guests).set({ guestGroup: null }).where(eq(guests.guestGroup, existing.name));
		await db.delete(guestGroups).where(eq(guestGroups.id, id));
		return new Response(null, { status: 204 });
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to delete guest group' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

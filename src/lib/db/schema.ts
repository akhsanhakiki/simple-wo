import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const guests = pgTable('guests', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	address: text('address'),
	weddingLocation: text('wedding_location'),
	invitationTime: timestamp('invitation_time', { withTimezone: true }),
	invitationType: text('invitation_type'), // 'physical' | 'digital'
});

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

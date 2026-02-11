import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const guestGroups = pgTable('guest_groups', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
});

export type GuestGroup = typeof guestGroups.$inferSelect;
export type NewGuestGroup = typeof guestGroups.$inferInsert;

export const guests = pgTable('guests', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	address: text('address'),
	weddingLocation: text('wedding_location'),
	invitationTime: timestamp('invitation_time', { withTimezone: true }),
	invitationType: text('invitation_type'), // 'physical' | 'digital'
	guestType: text('guest_type'), // 'sekaliyan' | 'sendiri'
	guestGroup: text('guest_group'),
});

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

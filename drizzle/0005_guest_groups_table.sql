CREATE TABLE IF NOT EXISTS "guest_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL UNIQUE
);

INSERT INTO "guest_groups" ("name") VALUES
  ('Saudara Bulukerto'),
  ('Saudara Candi'),
  ('Tetangga Candi'),
  ('Teman Akhsan'),
  ('Teman Ibu Magetan'),
  ('Teman Bapak Magetan')
ON CONFLICT ("name") DO NOTHING;

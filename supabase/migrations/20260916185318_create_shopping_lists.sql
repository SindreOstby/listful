CREATE TABLE "public"."shopping_list_items" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "list_id"    uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "quantity"   numeric                  NOT NULL DEFAULT 1,
  "unit"       text,
  "is_checked" boolean                  NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shopping_list_items_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200))),
  CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "shopping_list_items_quantity_check" CHECK ((quantity > (0)::numeric)),
  CONSTRAINT "shopping_list_items_unit_check" CHECK (((unit IS NULL) OR ((char_length(unit) >= 1) AND (char_length(unit) <= 20))))
);

ALTER TABLE "public"."shopping_list_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."shopping_lists" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shopping_lists_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
  CONSTRAINT "shopping_lists_pkey" PRIMARY KEY (id),
  "owner_id"   uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."shopping_lists"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;

CREATE INDEX shopping_list_items_list_id_created_at_idx ON public.shopping_list_items USING btree (list_id, created_at);

REVOKE ALL ON TABLE "public"."shopping_list_items" FROM "anon", "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."shopping_list_items" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_list_items" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."shopping_lists" FROM "anon", "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."shopping_lists" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_lists" TO "postgres", "service_role";

ALTER TABLE "public"."shopping_lists"
  ADD CONSTRAINT "shopping_lists_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX shopping_lists_owner_id_idx ON public.shopping_lists USING btree (owner_id);

CREATE POLICY "Owners can add items to their lists" ON "public"."shopping_list_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.owner_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can delete items on their lists" ON "public"."shopping_list_items"
  FOR DELETE
  TO "authenticated"
  USING ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.owner_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can update items on their lists" ON "public"."shopping_list_items"
  FOR UPDATE
  TO "authenticated"
  USING ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.owner_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.owner_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can view items on their lists" ON "public"."shopping_list_items"
  FOR SELECT
  TO "authenticated"
  USING ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.owner_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can create lists" ON "public"."shopping_lists"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can delete their lists" ON "public"."shopping_lists"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can update their lists" ON "public"."shopping_lists"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can view their lists" ON "public"."shopping_lists"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id));

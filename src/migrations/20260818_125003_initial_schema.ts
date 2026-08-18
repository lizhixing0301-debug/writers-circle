import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_status" AS ENUM('active', 'paused', 'archived');
  CREATE TYPE "public"."enum_members_disability_category" AS ENUM('physical', 'visual', 'hearing', 'speech', 'intellectual', 'mental', 'multiple', 'other', 'notProvided');
  CREATE TYPE "public"."enum_members_disability_level" AS ENUM('level1', 'level2', 'level3', 'level4', 'notProvided');
  CREATE TYPE "public"."enum_members_consent_status" AS ENUM('notRequested', 'granted', 'denied');
  CREATE TYPE "public"."enum_submissions_category" AS ENUM('poetry', 'fiction', 'prose', 'criticism', 'other');
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('submitted', 'reviewing', 'revisionRequested', 'accepted', 'rejected');
  CREATE TYPE "public"."enum_published_works_category" AS ENUM('poetry', 'fiction', 'prose', 'criticism', 'other');
  CREATE TYPE "public"."enum_published_works_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_news_candidates_category" AS ENUM('creation', 'award', 'activity', 'media', 'personal', 'other');
  CREATE TYPE "public"."enum_news_candidates_source_type" AS ENUM('manual', 'publicTip', 'automaticSearch');
  CREATE TYPE "public"."enum_news_candidates_status" AS ENUM('pending', 'verifying', 'confirmed', 'rejected', 'duplicate');
  CREATE TYPE "public"."enum_wechat_search_runs_trigger" AS ENUM('admin', 'verification');
  CREATE TYPE "public"."enum_wechat_search_runs_status" AS ENUM('queued', 'running', 'succeeded', 'partial', 'failed');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "members_literary_identities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "members_organizations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "members_representative_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" varchar,
  	"year" numeric,
  	"notes" varchar
  );
  
  CREATE TABLE "members_search_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "members_websites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "members_known_we_chat_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"notes" varchar
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"pen_name" varchar,
  	"slug" varchar NOT NULL,
  	"status" "enum_members_status" DEFAULT 'active' NOT NULL,
  	"region" varchar,
  	"biography" varchar,
  	"public_biography" varchar,
  	"profile_image_id" integer,
  	"display_order" numeric DEFAULT 0,
  	"public_profile_enabled" boolean DEFAULT false,
  	"disability_category" "enum_members_disability_category" DEFAULT 'notProvided',
  	"disability_level" "enum_members_disability_level" DEFAULT 'notProvided',
  	"show_disability_category" boolean DEFAULT false,
  	"show_disability_level" boolean DEFAULT false,
  	"consent_status" "enum_members_consent_status" DEFAULT 'notRequested' NOT NULL,
  	"consent_date" timestamp(3) with time zone,
  	"consent_notes" varchar,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"submission_number" varchar NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"submitter_name" varchar NOT NULL,
  	"pen_name" varchar,
  	"contact" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"category" "enum_submissions_category" NOT NULL,
  	"content" varchar NOT NULL,
  	"notes" varchar,
  	"rights_confirmed" boolean DEFAULT false NOT NULL,
  	"status" "enum_submissions_status" DEFAULT 'submitted' NOT NULL,
  	"related_member_id" integer,
  	"review_notes" varchar,
  	"request_token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "published_works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"author_name" varchar NOT NULL,
  	"related_member_id" integer,
  	"category" "enum_published_works_category" NOT NULL,
  	"excerpt" varchar,
  	"content" varchar NOT NULL,
  	"source_submission_id" integer,
  	"publication_authorized" boolean DEFAULT false,
  	"authorization_notes" varchar,
  	"status" "enum_published_works_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_candidates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"candidate_number" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"related_member_id" integer,
  	"related_person_name" varchar,
  	"category" "enum_news_candidates_category" NOT NULL,
  	"summary" varchar,
  	"published_at" timestamp(3) with time zone,
  	"source_type" "enum_news_candidates_source_type" DEFAULT 'manual' NOT NULL,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_reference" varchar,
  	"discovered_at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_news_candidates_status" DEFAULT 'pending' NOT NULL,
  	"verification_notes" varchar,
  	"verified_at" timestamp(3) with time zone,
  	"publicly_visible" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wechat_search_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"run_number" varchar NOT NULL,
  	"trigger" "enum_wechat_search_runs_trigger" NOT NULL,
  	"status" "enum_wechat_search_runs_status" DEFAULT 'queued' NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"member_count" numeric DEFAULT 0 NOT NULL,
  	"planned_query_count" numeric DEFAULT 0 NOT NULL,
  	"api_call_count" numeric DEFAULT 0 NOT NULL,
  	"result_count" numeric DEFAULT 0 NOT NULL,
  	"created_count" numeric DEFAULT 0 NOT NULL,
  	"duplicate_count" numeric DEFAULT 0 NOT NULL,
  	"failed_query_count" numeric DEFAULT 0 NOT NULL,
  	"error_summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer,
  	"media_id" integer,
  	"submissions_id" integer,
  	"published_works_id" integer,
  	"news_candidates_id" integer,
  	"wechat_search_runs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_aliases" ADD CONSTRAINT "members_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_literary_identities" ADD CONSTRAINT "members_literary_identities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_organizations" ADD CONSTRAINT "members_organizations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_representative_works" ADD CONSTRAINT "members_representative_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_search_keywords" ADD CONSTRAINT "members_search_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_websites" ADD CONSTRAINT "members_websites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_known_we_chat_accounts" ADD CONSTRAINT "members_known_we_chat_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_related_member_id_members_id_fk" FOREIGN KEY ("related_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "published_works" ADD CONSTRAINT "published_works_related_member_id_members_id_fk" FOREIGN KEY ("related_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "published_works" ADD CONSTRAINT "published_works_source_submission_id_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_candidates" ADD CONSTRAINT "news_candidates_related_member_id_members_id_fk" FOREIGN KEY ("related_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_published_works_fk" FOREIGN KEY ("published_works_id") REFERENCES "public"."published_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_candidates_fk" FOREIGN KEY ("news_candidates_id") REFERENCES "public"."news_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wechat_search_runs_fk" FOREIGN KEY ("wechat_search_runs_id") REFERENCES "public"."wechat_search_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "members_aliases_order_idx" ON "members_aliases" USING btree ("_order");
  CREATE INDEX "members_aliases_parent_id_idx" ON "members_aliases" USING btree ("_parent_id");
  CREATE INDEX "members_literary_identities_order_idx" ON "members_literary_identities" USING btree ("_order");
  CREATE INDEX "members_literary_identities_parent_id_idx" ON "members_literary_identities" USING btree ("_parent_id");
  CREATE INDEX "members_organizations_order_idx" ON "members_organizations" USING btree ("_order");
  CREATE INDEX "members_organizations_parent_id_idx" ON "members_organizations" USING btree ("_parent_id");
  CREATE INDEX "members_representative_works_order_idx" ON "members_representative_works" USING btree ("_order");
  CREATE INDEX "members_representative_works_parent_id_idx" ON "members_representative_works" USING btree ("_parent_id");
  CREATE INDEX "members_search_keywords_order_idx" ON "members_search_keywords" USING btree ("_order");
  CREATE INDEX "members_search_keywords_parent_id_idx" ON "members_search_keywords" USING btree ("_parent_id");
  CREATE INDEX "members_websites_order_idx" ON "members_websites" USING btree ("_order");
  CREATE INDEX "members_websites_parent_id_idx" ON "members_websites" USING btree ("_parent_id");
  CREATE INDEX "members_known_we_chat_accounts_order_idx" ON "members_known_we_chat_accounts" USING btree ("_order");
  CREATE INDEX "members_known_we_chat_accounts_parent_id_idx" ON "members_known_we_chat_accounts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "members_slug_idx" ON "members" USING btree ("slug");
  CREATE INDEX "members_profile_image_idx" ON "members" USING btree ("profile_image_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "submissions_submission_number_idx" ON "submissions" USING btree ("submission_number");
  CREATE INDEX "submissions_submitted_at_idx" ON "submissions" USING btree ("submitted_at");
  CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");
  CREATE INDEX "submissions_related_member_idx" ON "submissions" USING btree ("related_member_id");
  CREATE UNIQUE INDEX "submissions_request_token_idx" ON "submissions" USING btree ("request_token");
  CREATE INDEX "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "published_works_slug_idx" ON "published_works" USING btree ("slug");
  CREATE INDEX "published_works_related_member_idx" ON "published_works" USING btree ("related_member_id");
  CREATE INDEX "published_works_source_submission_idx" ON "published_works" USING btree ("source_submission_id");
  CREATE INDEX "published_works_status_idx" ON "published_works" USING btree ("status");
  CREATE INDEX "published_works_published_at_idx" ON "published_works" USING btree ("published_at");
  CREATE INDEX "published_works_updated_at_idx" ON "published_works" USING btree ("updated_at");
  CREATE INDEX "published_works_created_at_idx" ON "published_works" USING btree ("created_at");
  CREATE UNIQUE INDEX "news_candidates_candidate_number_idx" ON "news_candidates" USING btree ("candidate_number");
  CREATE INDEX "news_candidates_related_member_idx" ON "news_candidates" USING btree ("related_member_id");
  CREATE INDEX "news_candidates_discovered_at_idx" ON "news_candidates" USING btree ("discovered_at");
  CREATE INDEX "news_candidates_status_idx" ON "news_candidates" USING btree ("status");
  CREATE INDEX "news_candidates_updated_at_idx" ON "news_candidates" USING btree ("updated_at");
  CREATE INDEX "news_candidates_created_at_idx" ON "news_candidates" USING btree ("created_at");
  CREATE UNIQUE INDEX "wechat_search_runs_run_number_idx" ON "wechat_search_runs" USING btree ("run_number");
  CREATE INDEX "wechat_search_runs_status_idx" ON "wechat_search_runs" USING btree ("status");
  CREATE INDEX "wechat_search_runs_updated_at_idx" ON "wechat_search_runs" USING btree ("updated_at");
  CREATE INDEX "wechat_search_runs_created_at_idx" ON "wechat_search_runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");
  CREATE INDEX "payload_locked_documents_rels_published_works_id_idx" ON "payload_locked_documents_rels" USING btree ("published_works_id");
  CREATE INDEX "payload_locked_documents_rels_news_candidates_id_idx" ON "payload_locked_documents_rels" USING btree ("news_candidates_id");
  CREATE INDEX "payload_locked_documents_rels_wechat_search_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("wechat_search_runs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "members_aliases" CASCADE;
  DROP TABLE "members_literary_identities" CASCADE;
  DROP TABLE "members_organizations" CASCADE;
  DROP TABLE "members_representative_works" CASCADE;
  DROP TABLE "members_search_keywords" CASCADE;
  DROP TABLE "members_websites" CASCADE;
  DROP TABLE "members_known_we_chat_accounts" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "submissions" CASCADE;
  DROP TABLE "published_works" CASCADE;
  DROP TABLE "news_candidates" CASCADE;
  DROP TABLE "wechat_search_runs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_members_status";
  DROP TYPE "public"."enum_members_disability_category";
  DROP TYPE "public"."enum_members_disability_level";
  DROP TYPE "public"."enum_members_consent_status";
  DROP TYPE "public"."enum_submissions_category";
  DROP TYPE "public"."enum_submissions_status";
  DROP TYPE "public"."enum_published_works_category";
  DROP TYPE "public"."enum_published_works_status";
  DROP TYPE "public"."enum_news_candidates_category";
  DROP TYPE "public"."enum_news_candidates_source_type";
  DROP TYPE "public"."enum_news_candidates_status";
  DROP TYPE "public"."enum_wechat_search_runs_trigger";
  DROP TYPE "public"."enum_wechat_search_runs_status";`)
}

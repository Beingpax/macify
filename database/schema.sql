PRAGMA foreign_keys = ON;

CREATE TABLE `apps` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `website_url` text NOT NULL,
  `tagline` text NOT NULL,
  `description` text NOT NULL,
  `pricing_type` text NOT NULL,
  `billing_type` text,
  `pricing_details` text,
  `source_type` text NOT NULL,
  `youtube_url` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `is_featured` integer DEFAULT false NOT NULL,
  `is_editors_pick` integer DEFAULT false NOT NULL,
  `featured_at` integer,
  `published_at` integer,
  `deleted_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX `apps_slug_unique` ON `apps` (`slug`);
CREATE UNIQUE INDEX `apps_website_url_unique` ON `apps` (`website_url`);
CREATE INDEX `apps_status_published_idx` ON `apps` (`status`, `published_at`);
CREATE INDEX `apps_name_idx` ON `apps` (`name`);

CREATE TABLE `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);

CREATE TABLE `app_categories` (
  `app_id` text NOT NULL,
  `category_id` text NOT NULL,
  PRIMARY KEY (`app_id`, `category_id`),
  FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE cascade,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE cascade
);

CREATE INDEX `app_categories_category_idx` ON `app_categories` (`category_id`, `app_id`);

CREATE TABLE `app_relationships` (
  `id` text PRIMARY KEY NOT NULL,
  `source_app_id` text NOT NULL,
  `target_app_id` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`source_app_id`) REFERENCES `apps` (`id`) ON DELETE cascade,
  FOREIGN KEY (`target_app_id`) REFERENCES `apps` (`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `app_relationships_pair_unique` ON `app_relationships` (`source_app_id`, `target_app_id`);
CREATE INDEX `app_relationships_target_idx` ON `app_relationships` (`target_app_id`);

CREATE TABLE `catalogue_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `app_id` text,
  `app_slug` text NOT NULL,
  `change_type` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `source_repository` text NOT NULL,
  `source_path` text NOT NULL,
  `source_commit_sha` text NOT NULL,
  `manifest_hash` text NOT NULL,
  `manifest` text,
  `prepared_media` text DEFAULT '[]' NOT NULL,
  `errors` text DEFAULT '[]' NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `reviewed_at` integer,
  FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE set null
);

CREATE UNIQUE INDEX `catalogue_revisions_commit_path_unique` ON `catalogue_revisions` (`source_commit_sha`, `source_path`);
CREATE INDEX `catalogue_revisions_status_created_idx` ON `catalogue_revisions` (`status`, `created_at`);
CREATE INDEX `catalogue_revisions_app_slug_idx` ON `catalogue_revisions` (`app_slug`, `created_at`);

CREATE TABLE `deals` (
  `id` text PRIMARY KEY NOT NULL,
  `app_id` text NOT NULL,
  `discount_percent` integer NOT NULL,
  `code` text,
  `url` text NOT NULL,
  `starts_at` integer NOT NULL,
  `ends_at` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `deals_app_unique` ON `deals` (`app_id`);
CREATE INDEX `deals_active_window_idx` ON `deals` (`starts_at`, `ends_at`);

CREATE TABLE `media_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `app_id` text,
  `role` text NOT NULL,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL,
  `byte_size` integer NOT NULL,
  `width` integer,
  `height` integer,
  `checksum` text NOT NULL,
  `source_url` text,
  `alt_text` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `media_assets_storage_key_unique` ON `media_assets` (`storage_key`);
CREATE INDEX `media_assets_app_role_idx` ON `media_assets` (`app_id`, `role`);
CREATE INDEX `media_assets_checksum_idx` ON `media_assets` (`checksum`);

CREATE TABLE `admin_login_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `expires_at` integer NOT NULL
);

CREATE INDEX `admin_login_attempts_expires_idx` ON `admin_login_attempts` (`expires_at`);

-- OpenNext on-demand cache invalidation metadata. Cache payloads live under
-- the dedicated next-cache/ prefix in R2.
CREATE TABLE `revalidations` (
  `tag` text NOT NULL,
  `revalidatedAt` integer NOT NULL,
  `stale` integer,
  `expire` integer,
  UNIQUE (`tag`) ON CONFLICT REPLACE
);

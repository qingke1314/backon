-- AlterTable
ALTER TABLE `Post` ADD COLUMN `isFavorited` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastEditedAt` DATETIME(3) NULL,
    ADD COLUMN `previewText` VARCHAR(191) NULL;

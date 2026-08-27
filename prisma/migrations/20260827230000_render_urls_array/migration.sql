-- Render de una versión pasa de una sola imagen (renderUrl) a una lista
-- de archivos (renderUrls), sin perder los renders ya subidos.
ALTER TABLE "versiones_entrega" ADD COLUMN "renderUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "versiones_entrega" SET "renderUrls" = ARRAY["renderUrl"] WHERE "renderUrl" IS NOT NULL;

ALTER TABLE "versiones_entrega" DROP COLUMN "renderUrl";

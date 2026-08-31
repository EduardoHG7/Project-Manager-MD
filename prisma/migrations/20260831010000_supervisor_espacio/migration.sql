-- AlterTable
ALTER TABLE "espacios" ADD COLUMN     "supervisorId" TEXT;

-- AddForeignKey
ALTER TABLE "espacios" ADD CONSTRAINT "espacios_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;


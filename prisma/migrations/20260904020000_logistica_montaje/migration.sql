-- AlterTable
ALTER TABLE "espacios" ADD COLUMN     "internet" BOOLEAN,
ADD COLUMN     "internetCableado" BOOLEAN,
ADD COLUMN     "internetCableadoMb" INTEGER,
ADD COLUMN     "internetIpPublica" BOOLEAN,
ADD COLUMN     "internetP2P" BOOLEAN,
ADD COLUMN     "internetPortalCautivo" BOOLEAN,
ADD COLUMN     "internetSalidaAdicional" BOOLEAN,
ADD COLUMN     "internetWifi" BOOLEAN,
ADD COLUMN     "internetWifiMb" INTEGER,
ADD COLUMN     "manliftBrazo" BOOLEAN,
ADD COLUMN     "manliftBrazoHorasDesmontaje" DOUBLE PRECISION,
ADD COLUMN     "manliftBrazoHorasMontaje" DOUBLE PRECISION,
ADD COLUMN     "montacargas" BOOLEAN,
ADD COLUMN     "montacargasHorasDesmontaje" DOUBLE PRECISION,
ADD COLUMN     "montacargasHorasMontaje" DOUBLE PRECISION,
ADD COLUMN     "riggingPuntos" INTEGER;


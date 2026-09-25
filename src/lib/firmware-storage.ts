import path from "node:path";

const DEFAULT_STORAGE_DIRECTORY = path.join(/* turbopackIgnore: true */ process.cwd(), "var", "firmware");

export const MAX_FIRMWARE_SIZE_BYTES = 4 * 1024 * 1024;

export function getFirmwareStorageDirectory() {
  return path.resolve(process.env.FIRMWARE_STORAGE_DIR || DEFAULT_STORAGE_DIRECTORY);
}

export function getFirmwarePath(storageKey: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(storageKey)) {
    throw new Error("Gecersiz firmware depolama anahtari.");
  }

  return path.join(getFirmwareStorageDirectory(), storageKey);
}

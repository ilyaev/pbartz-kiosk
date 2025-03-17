import fs from "fs";

export const cacheFileExists = (
  fileName: string,
  bucket: string = ""
): boolean => {
  const filePath =
    (process.env.CACHE_FILES_BASE_PATH || "./files/") +
    (bucket ? `${bucket}/` : "") +
    fileName;
  return fs.existsSync(filePath);
};

export const cacheFile = (
  buffer: Buffer,
  fileName: string,
  bucket: string = ""
): string => {
  const filePath =
    (process.env.CACHE_FILES_BASE_PATH || "./files/") +
    (bucket ? `${bucket}/` : "") +
    fileName;

  if (!fileName) {
    return "";
  }

  fs.writeFileSync(filePath, buffer);

  return filePath;
};

export const cacheImage = async (
  url: string,
  bucket: string = ""
): Promise<string> => {
  const fileName = url.split("/").pop() || "";
  const filePath =
    (process.env.CACHE_FILES_BASE_PATH || "./files/") +
    (bucket ? `${bucket}/` : "") +
    fileName;

  if (!fileName) {
    return url;
  }

  if (fs.existsSync(filePath)) {
    return `files/${bucket || "index"}/${fileName}`;
  }

  const allowed = (process.env.CACHE_IMAGE_EXTENSIONS || ".jpg,.png")
    .split(",")
    .some((ext) => (url.indexOf(ext) !== -1 ? true : false));

  if (!allowed) {
    return url;
  }

  const response = await fetch(url);
  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return `files/${bucket || "index"}/${fileName}`;
};

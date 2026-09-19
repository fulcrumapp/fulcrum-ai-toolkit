import fs from 'node:fs';

export function pathEntryExists(filePath) {
  return fs.lstatSync(filePath, { throwIfNoEntry: false }) !== undefined;
}

export function validateForbiddenPackagePaths(relativePaths, isPresent) {
  return relativePaths
    .filter((relativePath) => isPresent(relativePath))
    .map((relativePath) => `${relativePath}: redundant vendor-specific file must not be present`);
}

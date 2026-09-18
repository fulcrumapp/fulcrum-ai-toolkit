export function validateForbiddenPackagePaths(relativePaths, isPresent) {
  return relativePaths
    .filter((relativePath) => isPresent(relativePath))
    .map((relativePath) => `${relativePath}: redundant vendor-specific file must not be present`);
}

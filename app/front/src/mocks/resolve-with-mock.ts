export async function resolveWithMock<T>(
  request: () => Promise<T>,
  _resolver: () => T | Promise<T>,
): Promise<T> {
  return request();
}

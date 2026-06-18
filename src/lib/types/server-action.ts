export type ServerActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; field?: string } };

export function ok<T>(data: T): ServerActionResult<T> {
  return { ok: true, data };
}

export function err<T = never>(
  code: string,
  message: string,
  field?: string,
): ServerActionResult<T> {
  return { ok: false, error: { code, message, field } };
}

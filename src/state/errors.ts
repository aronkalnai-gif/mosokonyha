/** An error code raised by the database (see supabase/migrations). */
export class ServerError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

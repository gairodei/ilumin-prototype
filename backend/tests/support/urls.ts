/** Login roles used only by the test suite on a disposable server. */
export const TEST_ROLES = { owner: 'ilumin_test_owner', api: 'ilumin_test_api' } as const;

export function roleUrl(adminUrl: string, user: string, password: string, database: string): string {
  const u = new URL(adminUrl);
  u.username = user;
  u.password = password;
  u.pathname = `/${database}`;
  return u.toString();
}

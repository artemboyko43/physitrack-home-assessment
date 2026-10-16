const USER_BY_TOKEN: Readonly<Record<string, string>> = {
  "dev-token-ada": "ada",
  "dev-token-ben": "ben",
};

export function userIdFromAuthorization(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;

  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const token = match?.[1];
  if (token === undefined) return undefined;

  return USER_BY_TOKEN[token];
}

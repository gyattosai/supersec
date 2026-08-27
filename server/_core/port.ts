export function resolveServerPort(value: string | undefined = process.env.PORT) {
  const port = Number(value || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port number");
  }
  return port;
}

export const GET = async (_request: Request, context: RouteContext<"/files/[name]">) => {
  const { name } = await context.params
  return Response.json({ file: name, contents: "confidential" })
}

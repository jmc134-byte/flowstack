export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 7)
  )
}

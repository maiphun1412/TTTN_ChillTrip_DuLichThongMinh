import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "PUBLISHED";

    const articles = await prisma.articles.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword } },
                { summary: { contains: keyword } },
                { content: { contains: keyword } },
              ],
            }
          : {}),
      },
      orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    });

    const result = articles.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      content: item.content,
      featuredImageUrl: item.featured_image_url,
      status: item.status,
      publishedAt: item.published_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      category: item.category,
    }));

    return ok(serialize(result), "Lấy danh sách bài viết thành công");
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return fail("Không thể lấy danh sách bài viết", 500);
  }
}
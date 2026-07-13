import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const article = await prisma.articles.findUnique({
      where: { slug },
    });

    if (!article || article.status !== "PUBLISHED") {
      return fail("Không tìm thấy bài viết", 404);
    }

    const result = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      featuredImageUrl: article.featured_image_url,
      status: article.status,
      publishedAt: article.published_at,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      category: article.category,
    };

    return ok(serialize(result), "Lấy chi tiết bài viết thành công");
  } catch (error) {
    console.error("GET /api/articles/[slug] error:", error);
    return fail("Không thể lấy chi tiết bài viết", 500);
  }
}
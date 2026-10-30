import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const articleSchema = z.object({
  title: z.string().min(2, "Tiêu đề tối thiểu 2 ký tự"),
  slug: z.string().min(2, "Slug tối thiểu 2 ký tự"),
  summary: z.string().optional().or(z.literal("")),
  content: z.string().min(5, "Nội dung bài viết quá ngắn"),
  featuredImage: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).default("DRAFT"),
  publishedAt: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
});

export async function GET(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const articles = await prisma.articles.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword } },
                { slug: { contains: keyword } },
                { summary: { contains: keyword } },
                { content: { contains: keyword } },
                { category: { contains: keyword } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ok(serialize(articles), "Lấy danh sách bài viết thành công");
  } catch (error) {
    console.error("GET /api/admin/articles error:", error);
    return fail("Không thể lấy danh sách bài viết", 500);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) {
    return fail(
      auth.reason === "UNAUTHORIZED" ? "Chưa đăng nhập" : "Không có quyền",
      auth.reason === "UNAUTHORIZED" ? 401 : 403
    );
  }

  try {
    const body = await req.json();
    const parsed = articleSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Dữ liệu không hợp lệ", 422, parsed.error.flatten());
    }

    const data = parsed.data;

    const existed = await prisma.articles.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (existed) {
      return fail("Slug bài viết đã tồn tại", 409);
    }

    const authUser = auth.user as any;

const created = await prisma.articles.create({
  data: {
    title: data.title,
    slug: data.slug,
    summary: data.summary || null,
    content: data.content,
    featured_image_url: data.featuredImage || null,
    status: data.status,
    published_at:
      data.status === "PUBLISHED"
        ? data.publishedAt
          ? new Date(data.publishedAt)
          : new Date()
        : data.publishedAt
        ? new Date(data.publishedAt)
        : null,
    created_by: authUser?.id
      ? Number(authUser.id)
      : authUser?.userId
      ? Number(authUser.userId)
      : authUser?.sub
      ? Number(authUser.sub)
      : null,
    category: data.category || null,
  },
});

    return ok(serialize(created), "Tạo bài viết thành công", 201);
  } catch (error) {
    console.error("POST /api/admin/articles error:", error);
    return fail("Không thể tạo bài viết", 500);
  }
}
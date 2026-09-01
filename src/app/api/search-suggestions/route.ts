import { NextResponse } from "next/server";
import { getPosts } from "@/lib/wordpress";

export async function GET() {
  try {
    const posts = await getPosts({
      perPage: 8,
    });

    const results = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      image: post.data.featuredImage
        ? {
            url: post.data.featuredImage.url,
            alt: post.data.featuredImage.alt || post.title,
          }
        : null,
      contentType: post.data.contentType,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search suggestions error:", error);

    return NextResponse.json(
      { error: "Failed to load articles" },
      { status: 500 }
    );
  }
}
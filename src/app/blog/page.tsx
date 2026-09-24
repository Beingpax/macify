import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/site/public-site";
import { getAllBlogPosts } from "@/content/blog";

const canonical = "https://macify.app/blog";

export const metadata: Metadata = {
  title: "Mac app guides and comparisons",
  description: "Practical Mac app comparisons and guides from Macify, covering pricing, features, privacy, and the differences that matter.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    siteName: "Macify",
    title: "Mac app guides and comparisons",
    description: "Practical comparisons that make choosing the right Mac application easier.",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mac app guides and comparisons",
    description: "Practical comparisons that make choosing the right Mac application easier.",
  },
};

export default function BlogPage() {
  const blogPosts = getAllBlogPosts();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#page`,
    name: "Mac app guides and comparisons",
    description: metadata.description,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: blogPosts.length,
      itemListElement: blogPosts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: `https://macify.app${post.path}`,
      })),
    },
  };

  return <PublicShell>
    <main className="blog-index blog-list-page" id="main-content">
      <header className="directory-heading blog-list-heading">
        <div><h1>Blog posts.</h1><p>Guides and comparisons for choosing better Mac apps.</p></div>
      </header>
      <section className="blog-post-grid" aria-label="Blog posts">
        {blogPosts.map((post) => <article className="blog-post-card" key={post.slug}>
          <Link aria-label={`Read ${post.title}`} className="blog-post-preview" href={post.path}>
            <Image alt="" fill sizes="(max-width: 38rem) calc(100vw - 2rem), (max-width: 68rem) calc((100vw - 4rem) / 2), 27rem" src={post.image.path} />
          </Link>
          <div className="blog-post-meta"><span>{post.category}</span></div>
          <h2><Link href={post.path}>{post.title}</Link></h2>
          <p>{post.description}</p>
        </article>)}
      </section>
    </main>
    <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} type="application/ld+json" />
  </PublicShell>;
}

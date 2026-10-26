import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import DOMPurify from 'dompurify'

export const Route = createFileRoute('/_site/blog/$slug')({
  component: BlogDetailPage,
})

function BlogDetailPage() {
  const { slug } = Route.useParams()
  const { data: blog, isLoading, error } = useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const res = await api.get("/api/blogs/" + slug)
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-6">
        <div className="h-8 w-48 bg-bg-elevated/50 animate-pulse rounded mb-4" />
        <div className="h-4 w-full bg-bg-elevated/50 animate-pulse rounded mb-2" />
        <div className="h-4 w-3/4 bg-bg-elevated/50 animate-pulse rounded" />
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Link to="/blog" className="text-accent hover:underline">Back to blog</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
      <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>
      <span className="text-sm text-text-muted/50 block mb-8">
        {new Date(blog.created_at).toLocaleDateString()}
      </span>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised by DOMPurify on this line. */}
      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blog.content, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] }) }} />
    </div>
  )
}

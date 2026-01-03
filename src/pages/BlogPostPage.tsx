/**
 * BlogPostPage - Single blog post page
 * Loads a published post by slug and renders content
 * Includes: SEO meta tags, OG/Twitter cards, JSON-LD schema, Share buttons
 * Typography: Substack-like reading experience with scoped prose styles
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Loader2, AlertCircle, Link2, Check, Share2, Clock } from 'lucide-react';
import { getPublishedPostBySlug } from '../../firebase/blog';
import type { BlogPost } from '../../firebase/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface BlogPostPageProps {
    slug: string;
    setViewState: (view: ViewState) => void;
    setSelectedBlogSlug: (slug: string | null) => void;
}

// Social share icons (inline SVG to avoid extra dependencies)
const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const LinkedInIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);

const FacebookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

// Scoped CSS for article typography (Substack-like reading experience)
const articleStyles = `
.popera-article {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 18px;
    line-height: 1.75;
    color: #1a1a1a;
}
.popera-article h1 {
    font-family: 'Outfit', 'Inter', sans-serif;
    font-size: 2.25rem;
    font-weight: 700;
    color: #15383c;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    line-height: 1.3;
}
.popera-article h2 {
    font-family: 'Outfit', 'Inter', sans-serif;
    font-size: 1.75rem;
    font-weight: 600;
    color: #15383c;
    margin-top: 2.25rem;
    margin-bottom: 0.875rem;
    line-height: 1.35;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.5rem;
}
.popera-article h3 {
    font-family: 'Outfit', 'Inter', sans-serif;
    font-size: 1.375rem;
    font-weight: 600;
    color: #15383c;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    line-height: 1.4;
}
.popera-article h4 {
    font-family: 'Outfit', 'Inter', sans-serif;
    font-size: 1.125rem;
    font-weight: 600;
    color: #15383c;
    margin-top: 1.75rem;
    margin-bottom: 0.625rem;
}
.popera-article p {
    margin-bottom: 1.5rem;
}
.popera-article a {
    color: #e35e25;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.15s ease;
}
.popera-article a:hover {
    color: #c44d1a;
}
.popera-article strong {
    font-weight: 600;
    color: #15383c;
}
.popera-article em {
    font-style: italic;
}
.popera-article ul, .popera-article ol {
    margin-bottom: 1.5rem;
    padding-left: 1.75rem;
}
.popera-article ul {
    list-style-type: disc;
}
.popera-article ol {
    list-style-type: decimal;
}
.popera-article li {
    margin-bottom: 0.625rem;
    padding-left: 0.375rem;
}
.popera-article li::marker {
    color: #e35e25;
}
.popera-article blockquote {
    border-left: 4px solid #e35e25;
    background-color: #fdf8f6;
    padding: 1rem 1.5rem;
    margin: 1.75rem 0;
    font-style: italic;
    color: #374151;
    border-radius: 0 0.5rem 0.5rem 0;
}
.popera-article blockquote p:last-child {
    margin-bottom: 0;
}
.popera-article code {
    font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
    font-size: 0.875em;
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: #e35e25;
}
.popera-article pre {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 1.25rem;
    border-radius: 0.75rem;
    overflow-x: auto;
    margin: 1.75rem 0;
    font-size: 0.875rem;
    line-height: 1.6;
}
.popera-article pre code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
}
.popera-article hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 2.5rem 0;
}
.popera-article img {
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    margin: 1.75rem 0;
}
.popera-article figure {
    margin: 1.75rem 0;
}
.popera-article figcaption {
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
}
.popera-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.75rem 0;
    font-size: 0.9375rem;
}
.popera-article th, .popera-article td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
    text-align: left;
}
.popera-article th {
    background-color: #f9fafb;
    font-weight: 600;
    color: #15383c;
}
.popera-article > *:first-child {
    margin-top: 0;
}
.popera-article > *:last-child {
    margin-bottom: 0;
}
`;

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug, setViewState, setSelectedBlogSlug }) => {
    const { language } = useLanguage();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copied, setCopied] = useState(false);

    // Calculate reading time from contentHtml
    const readingTime = useMemo(() => {
        if (!post?.contentHtml) return 1;
        const text = post.contentHtml.replace(/<[^>]*>/g, '');
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return Math.max(1, minutes);
    }, [post?.contentHtml]);

    const getPostUrl = useCallback(() => {
        return `${window.location.origin}/blog/${slug}`;
    }, [slug]);

    // Set SEO meta tags and JSON-LD
    useEffect(() => {
        if (!post) return;

        const postUrl = getPostUrl();
        const title = post.metaTitle || post.title;
        const description = post.metaDescription || post.excerpt || '';
        const image = post.heroImageUrl || '';

        document.title = title;

        const setMeta = (property: string, content: string, isName = false) => {
            const attr = isName ? 'name' : 'property';
            let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute(attr, property);
                document.head.appendChild(tag);
            }
            tag.content = content;
        };

        setMeta('description', description, true);
        setMeta('og:title', title);
        setMeta('og:description', description);
        setMeta('og:url', postUrl);
        setMeta('og:type', 'article');
        if (image) setMeta('og:image', image);
        setMeta('og:site_name', 'Popera');
        setMeta('twitter:card', image ? 'summary_large_image' : 'summary', true);
        setMeta('twitter:title', title, true);
        setMeta('twitter:description', description, true);
        if (image) setMeta('twitter:image', image, true);

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description: description,
            url: postUrl,
            datePublished: new Date(post.publishedAt).toISOString(),
            dateModified: new Date(post.updatedAt).toISOString(),
            image: image || undefined,
            author: { '@type': 'Organization', name: 'Popera', url: 'https://gopopera.ca' },
            publisher: { '@type': 'Organization', name: 'Popera', url: 'https://gopopera.ca' },
        };

        let scriptTag = document.querySelector('script[data-blog-jsonld]') as HTMLScriptElement;
        if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.type = 'application/ld+json';
            scriptTag.setAttribute('data-blog-jsonld', 'true');
            document.head.appendChild(scriptTag);
        }
        scriptTag.textContent = JSON.stringify(jsonLd);

        return () => {
            document.title = 'Popera';
            const script = document.querySelector('script[data-blog-jsonld]');
            if (script) script.remove();
        };
    }, [post, getPostUrl]);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            setNotFound(false);
            const fetchedPost = await getPublishedPostBySlug(slug);
            if (fetchedPost) {
                setPost(fetchedPost);
            } else {
                setNotFound(true);
            }
            setLoading(false);
        };
        fetchPost();
    }, [slug]);

    const handleBack = () => {
        setSelectedBlogSlug(null);
        setViewState(ViewState.BLOG);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getPostUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const input = document.createElement('input');
            input.value = getPostUrl();
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShareX = () => {
        const text = encodeURIComponent(post?.title || '');
        const url = encodeURIComponent(getPostUrl());
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
    };

    const handleShareLinkedIn = () => {
        const url = encodeURIComponent(getPostUrl());
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=550,height=420');
    };

    const handleShareFacebook = () => {
        const url = encodeURIComponent(getPostUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=550,height=420');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post?.title,
                    text: post?.excerpt || '',
                    url: getPostUrl(),
                });
            } catch {
                // User cancelled
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-[#fafafa] pt-16">
                <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-20 text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-700 mb-2">
                        {language === 'fr' ? 'Article non trouvé' : 'Post not found'}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {language === 'fr'
                            ? "L'article que vous cherchez n'existe pas ou a été supprimé."
                            : "The article you're looking for doesn't exist or has been removed."}
                    </p>
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#15383c] text-white rounded-lg hover:bg-[#0e2628] transition-colors"
                    >
                        <ChevronLeft size={18} />
                        {language === 'fr' ? 'Retour au blogue' : 'Back to blog'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{articleStyles}</style>

            <div className="min-h-screen bg-[#fafafa]">
                {/* Back navigation */}
                <div className="bg-white border-b border-gray-100 pt-20 sm:pt-24">
                    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-4">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-[#15383c] transition-colors text-sm"
                        >
                            <ChevronLeft size={18} />
                            <span>{language === 'fr' ? 'Retour au blogue' : 'Back to blog'}</span>
                        </button>
                    </div>
                </div>

                {/* Article Header */}
                <header className="bg-white pb-8 sm:pb-12">
                    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
                        {post?.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {post.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 text-xs font-medium bg-[#15383c]/5 text-[#15383c] rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#15383c] leading-tight font-['Outfit',sans-serif]">
                            {post?.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-5 text-gray-500 text-sm">
                            {post?.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                {readingTime} {language === 'fr' ? 'min de lecture' : 'min read'}
                            </span>
                        </div>
                        {post?.excerpt && (
                            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                                {post.excerpt}
                            </p>
                        )}
                    </div>
                </header>

                {/* Hero Image */}
                {post?.heroImageUrl && (
                    <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-2 mb-8">
                        <img
                            src={post.heroImageUrl}
                            alt={post.heroImageAlt || post.title}
                            className="w-full rounded-2xl shadow-lg"
                        />
                    </div>
                )}

                {/* Divider */}
                <div className="max-w-[720px] mx-auto px-4 sm:px-6">
                    <hr className="border-t border-gray-200 my-0" />
                </div>

                {/* Article Content */}
                <main className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
                    <article
                        className="popera-article"
                        dangerouslySetInnerHTML={{ __html: post?.contentHtml || '' }}
                    />

                    {post?.attribution && (
                        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 italic">
                            {post.attribution}
                        </div>
                    )}

                    {/* Share Section */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-[#15383c] mb-4">
                            {language === 'fr' ? 'Partager cet article' : 'Share this article'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
                            >
                                {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
                                {copied ? (language === 'fr' ? 'Copié!' : 'Copied!') : (language === 'fr' ? 'Copier le lien' : 'Copy link')}
                            </button>
                            <button
                                onClick={handleShareX}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
                                title="Share on X"
                            >
                                <XIcon />
                            </button>
                            <button
                                onClick={handleShareLinkedIn}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all text-[#0077b5]"
                                title="Share on LinkedIn"
                            >
                                <LinkedInIcon />
                            </button>
                            <button
                                onClick={handleShareFacebook}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all text-[#1877f2]"
                                title="Share on Facebook"
                            >
                                <FacebookIcon />
                            </button>
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#e35e25] text-white rounded-full hover:bg-[#d54d1a] transition-colors"
                                >
                                    <Share2 size={16} />
                                    {language === 'fr' ? 'Partager' : 'Share'}
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                {/* Back button footer */}
                <div className="max-w-[720px] mx-auto px-4 sm:px-6 pb-16 text-center">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-[#15383c] border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
                    >
                        <ChevronLeft size={18} />
                        {language === 'fr' ? 'Voir tous les articles' : 'View all articles'}
                    </button>
                </div>
            </div>
        </>
    );
};

/**
 * BlogPostPage - Single blog post page
 * Loads a published post by slug and renders content
 * Includes: SEO meta tags, OG/Twitter cards, JSON-LD schema, Share buttons
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Loader2, AlertCircle, Link2, Check, Share2 } from 'lucide-react';
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

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug, setViewState, setSelectedBlogSlug }) => {
    const { language } = useLanguage();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copied, setCopied] = useState(false);

    // Get current URL for sharing
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

        // Update document title
        document.title = title;

        // Helper to set or create meta tag
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

        // Basic meta
        setMeta('description', description, true);

        // Open Graph
        setMeta('og:title', title);
        setMeta('og:description', description);
        setMeta('og:url', postUrl);
        setMeta('og:type', 'article');
        if (image) setMeta('og:image', image);
        setMeta('og:site_name', 'Popera');

        // Twitter Card
        setMeta('twitter:card', image ? 'summary_large_image' : 'summary', true);
        setMeta('twitter:title', title, true);
        setMeta('twitter:description', description, true);
        if (image) setMeta('twitter:image', image, true);

        // JSON-LD Schema
        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description: description,
            url: postUrl,
            datePublished: new Date(post.publishedAt).toISOString(),
            dateModified: new Date(post.updatedAt).toISOString(),
            image: image || undefined,
            author: {
                '@type': 'Organization',
                name: 'Popera',
                url: 'https://gopopera.ca',
            },
            publisher: {
                '@type': 'Organization',
                name: 'Popera',
                url: 'https://gopopera.ca',
            },
        };

        let scriptTag = document.querySelector('script[data-blog-jsonld]') as HTMLScriptElement;
        if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.type = 'application/ld+json';
            scriptTag.setAttribute('data-blog-jsonld', 'true');
            document.head.appendChild(scriptTag);
        }
        scriptTag.textContent = JSON.stringify(jsonLd);

        // Cleanup on unmount
        return () => {
            document.title = 'Popera';
            // Remove JSON-LD script
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

    // Share handlers
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getPostUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
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
                // User cancelled or error
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#15383c] text-white pt-20 pb-8 sm:pt-24 sm:pb-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                    >
                        <ChevronLeft size={20} />
                        <span>{language === 'fr' ? 'Retour au blogue' : 'Back to blog'}</span>
                    </button>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading leading-tight">
                        {post?.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-white/70">
                        {post?.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                        {post?.tags && post.tags.length > 0 && (
                            <div className="flex gap-1">
                                {post.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-white/80">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Image */}
            {post?.heroImageUrl && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4">
                    <img
                        src={post.heroImageUrl}
                        alt={post.heroImageAlt || post.title}
                        className="w-full rounded-xl shadow-lg"
                    />
                </div>
            )}

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-10">
                    {/* Excerpt */}
                    {post?.excerpt && (
                        <p className="text-lg text-gray-600 italic mb-8 pb-8 border-b border-gray-100">
                            {post.excerpt}
                        </p>
                    )}

                    {/* Article body */}
                    <article
                        className="prose prose-lg max-w-none prose-headings:text-[#15383c] prose-a:text-[#e35e25] prose-strong:text-[#15383c]"
                        dangerouslySetInnerHTML={{ __html: post?.contentHtml || '' }}
                    />

                    {/* Attribution */}
                    {post?.attribution && (
                        <div className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500 italic">
                            {post.attribution}
                        </div>
                    )}

                    {/* Share Section */}
                    <div className="mt-10 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-[#15383c] mb-3">
                            {language === 'fr' ? 'Partager cet article' : 'Share this article'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Copy Link */}
                            <button
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
                                {copied ? (language === 'fr' ? 'Copié!' : 'Copied!') : (language === 'fr' ? 'Copier le lien' : 'Copy link')}
                            </button>

                            {/* X/Twitter */}
                            <button
                                onClick={handleShareX}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Share on X"
                            >
                                <XIcon />
                            </button>

                            {/* LinkedIn */}
                            <button
                                onClick={handleShareLinkedIn}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#0077b5]"
                                title="Share on LinkedIn"
                            >
                                <LinkedInIcon />
                            </button>

                            {/* Facebook */}
                            <button
                                onClick={handleShareFacebook}
                                className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#1877f2]"
                                title="Share on Facebook"
                            >
                                <FacebookIcon />
                            </button>

                            {/* Native Share (mobile) */}
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] transition-colors"
                                >
                                    <Share2 size={16} />
                                    {language === 'fr' ? 'Partager' : 'Share'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-[#15383c] border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft size={18} />
                        {language === 'fr' ? 'Voir tous les articles' : 'View all articles'}
                    </button>
                </div>
            </div>
        </div>
    );
};

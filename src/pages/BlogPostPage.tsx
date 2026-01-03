/**
 * BlogPostPage - Single blog post page
 * Loads a published post by slug and renders content
 */

import React, { useEffect, useState } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { getPublishedPostBySlug } from '../../firebase/blog';
import type { BlogPost } from '../../firebase/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface BlogPostPageProps {
    slug: string;
    setViewState: (view: ViewState) => void;
    setSelectedBlogSlug: (slug: string | null) => void;
}

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug, setViewState, setSelectedBlogSlug }) => {
    const { language } = useLanguage();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            setNotFound(false);
            const fetchedPost = await getPublishedPostBySlug(slug);
            if (fetchedPost) {
                setPost(fetchedPost);
                document.title = fetchedPost.metaTitle || fetchedPost.title;
            } else {
                setNotFound(true);
            }
            setLoading(false);
        };
        fetchPost();

        return () => {
            document.title = 'Popera';
        };
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50">
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
            <div className="bg-[#15383c] text-white py-8 sm:py-12">
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

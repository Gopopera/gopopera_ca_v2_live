/**
 * BlogListPage - Public blog listing page
 * Shows published blog posts from Firestore
 */

import React, { useEffect, useState } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Loader2, BookOpen } from 'lucide-react';
import { listPublishedPosts } from '../../firebase/blog';
import type { BlogPost } from '../../firebase/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface BlogListPageProps {
    setViewState: (view: ViewState) => void;
    setSelectedBlogSlug: (slug: string | null) => void;
}

export const BlogListPage: React.FC<BlogListPageProps> = ({ setViewState, setSelectedBlogSlug }) => {
    const { language } = useLanguage();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const fetchedPosts = await listPublishedPosts(50);
            setPosts(fetchedPosts);
            setLoading(false);
        };
        fetchPosts();
    }, []);

    // SEO: Set document title, meta description, canonical, and RSS link
    useEffect(() => {
        const SITE_URL = 'https://gopopera.ca';

        // Title
        document.title = language === 'fr' ? 'Blogue | Popera' : 'Blog | Popera';

        // Helper to set or create meta/link tag
        const setHeadTag = (tagType: string, attr: string, attrValue: string, content: string, contentAttr = 'content') => {
            let tag = document.querySelector(`${tagType}[${attr}="${attrValue}"]`) as HTMLElement;
            if (!tag) {
                tag = document.createElement(tagType);
                tag.setAttribute(attr, attrValue);
                document.head.appendChild(tag);
            }
            tag.setAttribute(contentAttr, content);
            return tag;
        };

        // Meta description
        const description = language === 'fr'
            ? 'Articles et guides pour créer des expériences communautaires mémorables sur Popera.'
            : 'Articles and guides for hosting and attending small community experiences on Popera.';
        setHeadTag('meta', 'name', 'description', description);

        // Canonical link
        let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = `${SITE_URL}/blog`;

        // RSS alternate link
        let rssLink = document.querySelector('link[type="application/rss+xml"]') as HTMLLinkElement;
        if (!rssLink) {
            rssLink = document.createElement('link');
            rssLink.rel = 'alternate';
            rssLink.type = 'application/rss+xml';
            rssLink.title = 'Popera Blog RSS';
            document.head.appendChild(rssLink);
        }
        rssLink.href = `${SITE_URL}/rss.xml`;

        // Cleanup
        return () => {
            document.title = 'Popera';
        };
    }, [language]);

    const handlePostClick = (slug: string) => {
        setSelectedBlogSlug(slug);
        setViewState(ViewState.BLOG_POST);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#15383c] text-white pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <button
                        onClick={() => setViewState(ViewState.LANDING)}
                        className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                    >
                        <ChevronLeft size={20} />
                        <span>{language === 'fr' ? 'Retour' : 'Back'}</span>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen size={32} className="text-[#e35e25]" />
                        <h1 className="text-3xl sm:text-4xl font-bold font-heading">
                            {language === 'fr' ? 'Blogue' : 'Blog'}
                        </h1>
                    </div>
                    <p className="text-white/70 text-lg">
                        {language === 'fr'
                            ? 'Articles et guides pour la communauté Popera'
                            : 'Articles and guides for the Popera community'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-600 mb-2">
                            {language === 'fr' ? 'Aucun article pour le moment' : 'No articles yet'}
                        </h2>
                        <p className="text-gray-500">
                            {language === 'fr'
                                ? 'Revenez bientôt pour découvrir nos articles.'
                                : 'Check back soon for new articles.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {posts.map((post) => (
                            <article
                                key={post.id}
                                onClick={() => handlePostClick(post.slug)}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                            >
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {post.heroImageUrl && (
                                        <div className="sm:w-40 sm:h-28 flex-shrink-0">
                                            <img
                                                src={post.heroImageUrl}
                                                alt={post.heroImageAlt || post.title}
                                                className="w-full h-40 sm:h-full object-cover rounded-lg"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-semibold text-[#15383c] mb-2 group-hover:text-[#e35e25] transition-colors">
                                            {post.title}
                                        </h2>
                                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span>{formatDate(post.publishedAt)}</span>
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="flex gap-1">
                                                    {post.tags.slice(0, 3).map((tag, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

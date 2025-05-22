import { PrismaService } from "../prisma/prisma.service";
export declare class PostsService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllPosts(currentUserId: number, query: {
        isFavorited?: string;
        authorId?: string;
        published?: string;
        lastEditedAfter?: string;
    }): Promise<{
        id: number;
        title: string;
        published: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastEditedAt: Date;
        previewText: string;
        authorId: number;
        author: {
            id: number;
            name: string;
        };
        categories: {
            id: number;
            name: string;
        }[];
        isUserOwner: boolean;
        isFavoritedByCurrentUser: boolean;
    }[]>;
    getPostById(id: number, currentUserId: number): Promise<{
        id: number;
        title: string;
        content: string;
        published: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastEditedAt: Date;
        previewText: string;
        authorId: number;
        author: {
            id: number;
            name: string;
        };
        categories: {
            id: number;
            name: string;
        }[];
        comments: {
            id: number;
            content: string;
            createdAt: Date;
            updatedAt: Date;
            authorId: number;
            postId: number;
        }[];
        isUserOwner: boolean;
        isFavoritedByCurrentUser: boolean;
    }>;
    createPost(userId: number, data: {
        title: string;
        content: string;
        published?: boolean;
    }): Promise<{
        message: string;
        status: number;
        success: boolean;
        data: {
            isUserOwner: boolean;
            author: {
                id: number;
                name: string;
            };
            categories: {
                id: number;
                name: string;
            }[];
            id: number;
            title: string;
            content: string;
            published: boolean;
            createdAt: Date;
            updatedAt: Date;
            lastEditedAt: Date | null;
            previewText: string | null;
            authorId: number;
        };
    }>;
    updatePost(id: number, userId: number, data: {
        title?: string;
        content?: string;
        published?: boolean;
        previewText?: string;
    }): Promise<{
        message: string;
        status: number;
        success: boolean;
        data: {
            isUserOwner: boolean;
            author: {
                id: number;
                name: string;
            };
            categories: {
                id: number;
                name: string;
            }[];
            id: number;
            title: string;
            content: string;
            published: boolean;
            createdAt: Date;
            updatedAt: Date;
            lastEditedAt: Date | null;
            previewText: string | null;
            authorId: number;
        };
    }>;
    deletePost(id: number, userId: number): Promise<{
        message: string;
        success: boolean;
    }>;
    favoritePost(postId: number, userId: number): Promise<{
        message: string;
        success: boolean;
        alreadyFavorited: boolean;
    } | {
        message: string;
        success: boolean;
        alreadyFavorited?: undefined;
    }>;
    unfavoritePost(postId: number, userId: number): Promise<{
        message: string;
        success: boolean;
    }>;
    getComments(postId: number): Promise<({
        author: {
            id: number;
            name: string;
        };
    } & {
        id: number;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: number;
        postId: number;
    })[]>;
    createComment(postId: number, userId: number, content: string): Promise<{
        author: {
            id: number;
            name: string;
        };
    } & {
        id: number;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: number;
        postId: number;
    }>;
}

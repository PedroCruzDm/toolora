export type Tool = {
  id: string;
  name: string;
  description: string;
  screenshot: string;
  url: string;
  category: string;
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
};
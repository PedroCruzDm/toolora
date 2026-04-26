export type ToolStatus = 'pending' | 'approved' | 'rejected';

export interface Tool {
	id: number;
	user_id: number;
	name: string;
	description: string;
	screenshot?: string;
	url: string;
	category: string;
	tags: string[] | null;
	likes_count: number;
	is_liked?: boolean;
	is_favorited?: boolean;
	status: ToolStatus;
	approved_at?: Date | null;
	created_at: Date;
	updated_at: Date;
}
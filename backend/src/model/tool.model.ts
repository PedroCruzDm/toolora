export type ToolStatus = 'pending' | 'approved' | 'rejected';

export interface Tool {
	id: number;
	user_id: number;
	name: string;
	description: string;
	screenshot?: string;
	url: string;
	category: string;
	likes_count: number;
	status: ToolStatus;
	approved_at?: Date;
	created_at: Date;
	updated_at: Date;
}

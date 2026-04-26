export interface User {
	id: number;
	username: string;
	email: string;
	password: string;
	isOwner: boolean;
	isAdmin: boolean;
	isModerator: boolean;
	isBanned: boolean;
	banReason?: string | null;
	banned_at?: Date | null;
	created_at: Date;
	updated_at: Date;
}
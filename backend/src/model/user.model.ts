export interface User {
	id: number;
	username: string;
	email: string;
	password: string;
	isAdmin: boolean;
	created_at: Date;
	updated_at: Date;
}

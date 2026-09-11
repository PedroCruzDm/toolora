import { createHash } from 'crypto';
import { Db, ObjectId } from 'mongodb';

const REFRESH_BLACKLIST_COLLECTION = 'refresh_token_blacklist';

type BlacklistReason = 'logout' | 'rotation' | 'replay' | 'forced_revoke';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
const LOGIN_LOCK_MS = LOGIN_LOCK_MINUTES * 60 * 1000;

type BlacklistedRefreshToken = {
	tokenHash: string;
	userId: string;
	jti: string;
	reason: BlacklistReason;
	blacklistedAt: Date;
	expiresAt: Date;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

type LoginAttemptState = { failedAttempts?: number; loginLockedUntil?: Date; };

export const getLoginLock = (user: LoginAttemptState | null) => {
	const lockedUntil = user?.loginLockedUntil;
	if (lockedUntil && lockedUntil.getTime() > Date.now()) {
		return lockedUntil;
	}

	return null;
};

export const registerFailedLogin = async (users: any, userId: unknown) => {
	const now = new Date();
	const user = await users.findOne({ _id: userId }, { projection: { failedAttempts: 1, loginLockedUntil: 1 } });
	const failedAttempts = Number(user?.failedAttempts ?? 0) + 1;
	const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;
	const loginLockedUntil = shouldLock ? new Date(now.getTime() + LOGIN_LOCK_MS) : null;

	await users.updateOne(
		{ _id: userId },
		{
			$set: {
				failedAttempts: shouldLock ? 0 : failedAttempts,
				loginLockedUntil,
			},
		}
	);

	return { failedAttempts, loginLockedUntil };
};

export const clearFailedLogins = async (users: any, userId: unknown) => {
	await users.updateOne({ _id: userId }, { $unset: { failedAttempts: '', loginLockedUntil: '' } });

};

export const ensureRefreshTokenBlacklistIndexes = async (db: Db) => {
	const collection = db.collection<BlacklistedRefreshToken>(REFRESH_BLACKLIST_COLLECTION);

	await collection.createIndex({ tokenHash: 1 }, { unique: true });
	await collection.createIndex({ userId: 1, blacklistedAt: -1 });
	await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
};

export const blacklistRefreshToken = async (
	db: Db,
	params: {
		token: string;
		userId: string;
		jti: string;
		expiresAt: Date;
		reason: BlacklistReason;
	}
) => {

	const collection = db.collection<BlacklistedRefreshToken>(REFRESH_BLACKLIST_COLLECTION);

	try {
		await collection.insertOne({
			tokenHash: hashToken(params.token),
			userId: params.userId,
			jti: params.jti,
			reason: params.reason,
			blacklistedAt: new Date(),
			expiresAt: params.expiresAt,
		});
	} catch {
		// Token already blacklisted; keep idempotent behavior.
	}
};

export const isRefreshTokenBlacklisted = async (db: Db, token: string) => {
	const collection = db.collection<BlacklistedRefreshToken>(REFRESH_BLACKLIST_COLLECTION);
	const doc = await collection.findOne({ tokenHash: hashToken(token) });
	return Boolean(doc);
};

export const blacklistAllUserTokensByVersionBump = async (db: Db, userId: string) => {
	const users = db.collection('users');

	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{ $inc: { token_version: 1 } }
	);
};
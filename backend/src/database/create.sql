CREATE DATABASE IF NOT EXISTS toolora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE toolora;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    ban_reason TEXT NULL,
    banned_at TIMESTAMP NULL DEFAULT NULL,
    profile_image VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tools_rented JSON,                             -- sem DEFAULT
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    screenshot VARCHAR(255),
    url VARCHAR(255),
    category VARCHAR(100),
    tags JSON NULL,
    likes_count INT DEFAULT 0,
    blocked_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT NULL,
    blocked_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP NULL DEFAULT NULL,
    available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tool_likes (
    user_id INT NOT NULL,
    tool_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tool_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tool_favorites (
    user_id INT NOT NULL,
    tool_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tool_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moderation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_user_id INT NOT NULL,
    request_type ENUM('ban_user', 'ban_post') NOT NULL,
    target_user_id INT NULL,
    target_tool_id INT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_user_id INT NULL,
    sender_role ENUM('owner', 'admin', 'moderator', 'system') NOT NULL DEFAULT 'system',
    recipient_user_id INT NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('warning', 'info') NOT NULL DEFAULT 'warning',
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tools_user_id ON tools(user_id);
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_owner ON users(is_owner);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_moderator ON users(is_moderator);
CREATE INDEX idx_users_is_banned ON users(is_banned);
CREATE INDEX idx_tool_likes_tool_id ON tool_likes(tool_id);
CREATE INDEX idx_tool_favorites_tool_id ON tool_favorites(tool_id);
CREATE INDEX idx_moderation_requests_status ON moderation_requests(status);
CREATE INDEX idx_user_messages_recipient_user_id ON user_messages(recipient_user_id);
-- LudoVerse Initial Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    coins BIGINT DEFAULT 1000,
    diamonds INT DEFAULT 0,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Friends (Adjacency List)
CREATE TABLE friends (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACCEPTED, BLOCKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

-- Match History
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(50) NOT NULL,
    game_mode VARCHAR(20) NOT NULL, -- CLASSIC, QUICK, MASTER
    status VARCHAR(20) NOT NULL, -- ONGOING, COMPLETED, ABORTED
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Match Players (Junction Table)
CREATE TABLE match_players (
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    placement INT, -- 1st, 2nd, 3rd, 4th
    score_earned INT DEFAULT 0,
    coins_earned INT DEFAULT 0,
    PRIMARY KEY (match_id, user_id)
);

-- Inventory (Cosmetics)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- DICE, BOARD, AVATAR_FRAME, EMOTE
    item_id VARCHAR(100) NOT NULL,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_inventory_user_item ON inventory(user_id, item_type);

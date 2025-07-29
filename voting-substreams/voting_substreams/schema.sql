-- 创建投票数据库表结构

-- 投票表
CREATE TABLE IF NOT EXISTS polls (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    start_time BIGINT,
    end_time BIGINT,
    creator VARCHAR,
    poll_account VARCHAR,
    created_at BIGINT,
    block_number BIGINT,
    transaction_hash VARCHAR,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 候选表
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    poll_id VARCHAR REFERENCES polls(id),
    created_at BIGINT,
    block_number BIGINT,
    transaction_hash VARCHAR,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 投票表
CREATE TABLE IF NOT EXISTS votes (
    id VARCHAR PRIMARY KEY,
    voter VARCHAR,
    poll_id VARCHAR REFERENCES polls(id),
    candidate_id VARCHAR REFERENCES candidates(id),
    created_at BIGINT,
    block_number BIGINT,
    transaction_hash VARCHAR,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_polls_creator ON polls(creator);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at);
CREATE INDEX IF NOT EXISTS idx_candidates_poll_id ON candidates(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);

-- 创建视图：投票统计
CREATE OR REPLACE VIEW poll_statistics AS
SELECT
    p.id as poll_id,
    p.name as poll_name,
    p.description,
    COUNT(DISTINCT c.id) as candidate_count,
    COUNT(v.id) as total_votes,
    p.start_time,
    p.end_time,
    p.creator
FROM polls p
LEFT JOIN candidates c ON p.id = c.poll_id
LEFT JOIN votes v ON p.id = v.poll_id
GROUP BY p.id, p.name, p.description, p.start_time, p.end_time, p.creator;

-- 创建视图：候选人得票统计
CREATE OR REPLACE VIEW candidate_vote_counts AS
SELECT
    c.id as candidate_id,
    c.name as candidate_name,
    p.id as poll_id,
    p.name as poll_name,
    COUNT(v.id) as vote_count
FROM candidates c
JOIN polls p ON c.poll_id = p.id
LEFT JOIN votes v ON c.id = v.candidate_id
GROUP BY c.id, c.name, p.id, p.name
ORDER BY p.id, vote_count DESC;

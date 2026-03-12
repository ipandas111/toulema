-- 投了吗 - Supabase 数据库表
-- 简化版（无需用户登录）

-- 1. 投递记录表
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '待投递',
    city TEXT,
    channel TEXT,
    deadline TEXT,
    applied_at TEXT,
    priority INT DEFAULT 2,
    notes TEXT,
    jd_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 用户画像表（存储求职偏好）
CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    target_positions TEXT[],
    target_cities TEXT[],
    expected_salary TEXT,
    experience_years INT,
    education TEXT,
    skills TEXT[],
    resume_url TEXT,
    blacklist_companies TEXT[],
    blacklist_keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- 4. 禁用 RLS（因为我们不用用户登录）
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile DISABLE ROW LEVEL SECURITY;

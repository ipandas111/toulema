-- 投了吗 - Supabase 数据库表
-- 在 Supabase SQL Editor 中执行

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
    target_positions TEXT[],        -- 目标岗位
    target_cities TEXT[],          -- 目标城市
    expected_salary TEXT,          -- 期望薪资
    experience_years INT,          -- 工作年限
    education TEXT,                -- 学历
    skills TEXT[],                 -- 技能
    resume_url TEXT,              -- 简历链接
    blacklist_companies TEXT[],    -- 黑名单公司
    blacklist_keywords TEXT[],      -- 黑名单关键词
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 投递记录索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- 4. 开启 RLS（行安全策略）
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- 5. 用户只能看自己的数据
CREATE POLICY "Users can only see their own jobs" ON jobs
    FOR ALL USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can only see their own profile" ON user_profile
    FOR ALL USING (user_id = auth.uid()::TEXT);

-- 6. 允许匿名访问（可选，如果不用登录）
-- 如果不需要用户登录，可以移除上面的 RLS 策略

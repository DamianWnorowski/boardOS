---
title: Supabase Setup Guide
category: deployment
tags: [supabase, database, setup, configuration]
related: [/06-deployment/production.md, /01-architecture/database-schema.md]
last-updated: 2025-08-29
---

# Supabase Setup Guide

## Quick Answer
Set up Supabase for BoardOS by creating a project, running database migrations, enabling real-time subscriptions, configuring Row Level Security, and deploying edge functions. Total setup time: ~30 minutes.

## Prerequisites

- Supabase account (free tier works for development)
- Git repository with BoardOS code
- Node.js 18+ installed locally
- Supabase CLI (optional but recommended)

## Step 1: Create Supabase Project

### Via Web Console

1. Navigate to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Configure project settings:

```yaml
Project Name: boardos-production
Database Password: [Generate strong password - SAVE THIS]
Region: Select closest to your users
Pricing Plan: Free (or Pro for production)
```

4. Wait for project provisioning (~2 minutes)
5. Note your project credentials:

```bash
Project URL: https://[project-id].supabase.co
Anon Key: eyJ... (public key for client)
Service Key: eyJ... (NEVER expose - server only)
```

### Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create project
supabase projects create boardos-production --region us-east-1

# Link to your project
supabase link --project-ref [project-id]
```

## Step 2: Database Schema Setup

### Run Initial Migration

Execute these SQL scripts in order via SQL Editor:

#### 1. Core Tables Creation
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'operator', 'driver', 'striper', 'foreman', 'laborer', 
    'privateDriver', 'skidsteer', 'paver', 'excavator', 
    'sweeper', 'millingMachine', 'grader', 'dozer', 
    'payloader', 'roller', 'equipment', 'truck'
  )),
  class_type TEXT,
  name TEXT NOT NULL,
  identifier TEXT,
  model TEXT,
  vin TEXT,
  location TEXT,
  on_site BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  job_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('street', 'highway', 'parking-lot')),
  shift TEXT NOT NULL CHECK (shift IN ('day', 'night')),
  notes TEXT,
  start_time TEXT,
  finalized BOOLEAN DEFAULT false,
  plants TEXT[],
  location JSONB,
  schedule_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  row_type TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  attached_to_assignment_id UUID REFERENCES assignments(id),
  time_slot JSONB,
  note TEXT,
  truck_config JSONB,
  schedule_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_active ON resources(is_active);
CREATE INDEX idx_jobs_schedule_date ON jobs(schedule_date);
CREATE INDEX idx_jobs_shift ON jobs(shift);
CREATE INDEX idx_assignments_resource ON assignments(resource_id);
CREATE INDEX idx_assignments_job ON assignments(job_id);
CREATE INDEX idx_assignments_schedule ON assignments(job_id, schedule_date);
```

#### 2. Business Rules Tables
```sql
-- Magnet interaction rules
CREATE TABLE magnet_interaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  can_attach BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop rules
CREATE TABLE drop_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  row_type TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job row configurations
CREATE TABLE job_row_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  row_type TEXT NOT NULL,
  label TEXT,
  position INTEGER DEFAULT 0,
  min_resources INTEGER DEFAULT 0,
  max_resources INTEGER,
  box_configs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rules
INSERT INTO magnet_interaction_rules (source_type, target_type, is_required) VALUES
  ('operator', 'excavator', true),
  ('operator', 'paver', true),
  ('driver', 'truck', true),
  ('screwman', 'paver', false);

INSERT INTO drop_rules (resource_type, row_type, allowed) VALUES
  ('foreman', 'Forman', true),
  ('excavator', 'Equipment', true),
  ('truck', 'Trucks', true);
```

#### 3. Supporting Tables
```sql
-- Employee details
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  phone_number TEXT,
  email TEXT,
  certifications TEXT[],
  skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment details
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT UNIQUE,
  model TEXT,
  make TEXT,
  year INTEGER,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  is_operational BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 3: Enable Real-time Subscriptions

### Enable Realtime for Tables

```sql
-- CRITICAL: Enable real-time for all core tables
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE magnet_interaction_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE drop_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE job_row_configs;

-- Verify real-time is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Configure Real-time Settings

In Supabase Dashboard:
1. Go to Settings → Database
2. Under "Realtime", ensure it's enabled
3. Set max concurrent connections (default: 200)
4. Configure message rate limits if needed

## Step 4: Row Level Security (RLS)

### Development Mode (No RLS)
For quick development, disable RLS:

```sql
-- Disable RLS for development (NOT for production!)
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_interaction_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE drop_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_row_configs DISABLE ROW LEVEL SECURITY;
```

### Production Mode (With RLS)
For production, enable and configure RLS:

```sql
-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all resources
CREATE POLICY "Resources viewable by authenticated users"
  ON resources FOR SELECT
  TO authenticated
  USING (true);

-- Only managers can modify resources
CREATE POLICY "Resources editable by managers"
  ON resources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND type IN ('manager', 'admin')
    )
  );

-- Jobs policies
CREATE POLICY "Jobs viewable by authenticated users"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Jobs editable by schedulers"
  ON jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND type IN ('manager', 'admin', 'scheduler')
    )
  );

-- Assignments policies
CREATE POLICY "Assignments viewable by authenticated users"
  ON assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Assignments editable by schedulers"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND type IN ('manager', 'admin', 'scheduler')
    )
  );
```

## Step 5: Edge Functions Deployment

### Create Edge Functions

#### assign-resource Function
```typescript
// supabase/functions/assign-resource/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { resourceId, jobId, rowType } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Validate equipment has operator
  const { data: resource } = await supabase
    .from('resources')
    .select('type')
    .eq('id', resourceId)
    .single()
  
  if (['excavator', 'paver', 'millingMachine'].includes(resource.type)) {
    // Check for operator attachment
    const { data: operators } = await supabase
      .from('assignments')
      .select('*, resources!inner(type)')
      .eq('job_id', jobId)
      .eq('resources.type', 'operator')
    
    if (!operators?.length) {
      return new Response(
        JSON.stringify({ error: 'Equipment requires operator' }),
        { status: 400 }
      )
    }
  }
  
  // Create assignment
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      resource_id: resourceId,
      job_id: jobId,
      row_type: rowType
    })
    .select()
    .single()
  
  return new Response(
    JSON.stringify({ data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

#### Deploy Functions
```bash
# Deploy via CLI
supabase functions deploy assign-resource

# Or deploy all functions
supabase functions deploy
```

## Step 6: Authentication Setup

### Configure Auth Providers

1. In Supabase Dashboard → Authentication → Providers
2. Enable Email/Password authentication
3. Configure email templates:

```html
<!-- Confirmation email template -->
<h2>Confirm your BoardOS account</h2>
<p>Click below to confirm your email:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
```

### Set Redirect URLs

In Authentication → URL Configuration:
```
Site URL: https://boardos.yourdomain.com
Redirect URLs:
  - http://localhost:5173/*
  - https://boardos.yourdomain.com/*
  - https://*.vercel.app/*
```

## Step 7: Storage Configuration

### Create Storage Buckets

```sql
-- Via SQL or Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('attachments', 'attachments', false),
  ('exports', 'exports', false),
  ('avatars', 'avatars', true);
```

### Configure Storage Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow users to view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid()::text = owner);
```

## Step 8: Database Backups

### Automatic Backups
Pro plan includes automatic daily backups. For free tier:

```bash
# Manual backup via CLI
supabase db dump -f backup.sql

# Scheduled backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
supabase db dump -f "backups/boardos_$DATE.sql"

# Upload to S3/cloud storage
aws s3 cp "backups/boardos_$DATE.sql" s3://my-backups/
```

## Step 9: Performance Optimization

### Database Indexes
```sql
-- Additional performance indexes
CREATE INDEX idx_assignments_attached ON assignments(attached_to_assignment_id);
CREATE INDEX idx_resources_identifier ON resources(identifier) WHERE identifier IS NOT NULL;
CREATE INDEX idx_jobs_finalized ON jobs(finalized) WHERE finalized = false;

-- Analyze tables for query optimization
ANALYZE resources;
ANALYZE jobs;
ANALYZE assignments;
```

### Connection Pooling
Configure in Supabase Dashboard → Settings → Database:
- Pool Size: 15 (for free tier)
- Pool Mode: Transaction
- Connection Timeout: 15 seconds

## Step 10: Monitoring Setup

### Enable Database Metrics
1. Dashboard → Reports → Database
2. Monitor:
   - Query performance
   - Connection pool usage
   - Database size
   - Real-time subscriptions

### Set Up Alerts
```sql
-- Create monitoring functions
CREATE OR REPLACE FUNCTION monitor_long_queries()
RETURNS TABLE(pid int, duration interval, query text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state = 'active';
END;
$$ LANGUAGE plpgsql;
```

## Verification Checklist

### Test Your Setup

```typescript
// test-connection.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testConnection() {
  // Test read
  const { data: jobs, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .limit(1)
  
  console.log('Jobs test:', jobs ? 'SUCCESS' : jobError)
  
  // Test real-time
  const subscription = supabase
    .channel('test')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'jobs' 
    }, payload => {
      console.log('Real-time event:', payload)
    })
    .subscribe()
  
  console.log('Real-time test:', subscription ? 'SUCCESS' : 'FAILED')
}

testConnection()
```

### Migration Checklist
- [ ] All tables created successfully
- [ ] Real-time enabled for required tables
- [ ] RLS policies configured (if production)
- [ ] Edge functions deployed
- [ ] Authentication configured
- [ ] Storage buckets created
- [ ] Backups configured
- [ ] Connection test passes
- [ ] Real-time subscription works

## Troubleshooting

### Common Issues

#### Real-time Not Working
```sql
-- Check if realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Re-enable if missing
ALTER PUBLICATION supabase_realtime ADD TABLE your_table_name;
```

#### RLS Blocking Access
```sql
-- Temporarily check without RLS
SET LOCAL ROLE postgres;
SELECT * FROM resources;
RESET ROLE;

-- Debug RLS policies
SELECT * FROM pg_policies WHERE tablename = 'resources';
```

#### Slow Queries
```sql
-- Identify slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Add missing indexes
EXPLAIN ANALYZE SELECT * FROM your_slow_query;
```

## Next Steps

1. Configure environment variables: See [Environment Variables Guide](./environment-variables.md)
2. Deploy application: See [Production Deployment](./production.md)
3. Set up monitoring: See [Monitoring Guide](./monitoring.md)

The Supabase setup provides a complete backend infrastructure for BoardOS with real-time capabilities, authentication, and scalable PostgreSQL database.
-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'police', 'volunteer', 'public');

-- Case Status Enum
CREATE TYPE case_status AS ENUM ('Pending', 'Found', 'Reunited', 'Transferred to hospital', 'Unresolved');

-- Found Sighting Status Enum
CREATE TYPE sighting_status AS ENUM ('Unmatched', 'Probable Match', 'Resolved');

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'public',
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Zones table (Nashik Kumbh Mela admin zones)
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lng DOUBLE PRECISION NOT NULL,
    approx_boundary_points INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Police Stations table (Real Nashik stations)
CREATE TABLE IF NOT EXISTS police_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CCTV Locations table (1,280 CCTV coordinate map nodes)
CREATE TABLE IF NOT EXISTS cctv (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(50) UNIQUE NOT NULL,
    zone_name VARCHAR(100) REFERENCES zones(name),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Missing Persons table (Central missing registry)
CREATE TABLE IF NOT EXISTS missing_persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(50) UNIQUE NOT NULL, -- Format: KMP-2027-XXXXX
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(255), -- Can be NULL (15% missing in dataset)
    gender VARCHAR(20) NOT NULL,
    age_band VARCHAR(20) NOT NULL, -- e.g., '0-12', '41-60', '61-70', '80+'
    state VARCHAR(100),
    district VARCHAR(100),
    language VARCHAR(100),
    last_seen_location TEXT NOT NULL,
    last_seen_zone VARCHAR(100) REFERENCES zones(name),
    last_seen_time TIMESTAMP WITH TIME ZONE,
    reporting_center VARCHAR(255),
    reporter_mobile VARCHAR(20), -- Can be NULL (20% missing in dataset)
    emergency_contact VARCHAR(20),
    physical_description TEXT,
    clothing_description TEXT,
    landmark VARCHAR(255),
    health_conditions TEXT,
    special_needs TEXT,
    voice_url TEXT, -- Link to recorded voice description file
    photo_url TEXT, -- Link to uploaded face photo
    status case_status NOT NULL DEFAULT 'Pending',
    resolution_hours DOUBLE PRECISION,
    is_duplicate_report BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Found Persons table (Volunteer sightings)
CREATE TABLE IF NOT EXISTS found_persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(255),
    gender VARCHAR(20),
    age_band VARCHAR(20),
    found_location TEXT NOT NULL,
    found_zone VARCHAR(100) REFERENCES zones(name),
    finder_name VARCHAR(255) NOT NULL,
    finder_contact VARCHAR(20) NOT NULL,
    photo_url TEXT,
    notes TEXT,
    matching_case_id UUID REFERENCES missing_persons(id),
    status sighting_status NOT NULL DEFAULT 'Unmatched',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Volunteers profiles
CREATE TABLE IF NOT EXISTS volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_zone VARCHAR(100) REFERENCES zones(name),
    phone_number VARCHAR(20) NOT NULL,
    last_known_lat DOUBLE PRECISION,
    last_known_lng DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive, On-Break
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Search Assignments (Assigning volunteers to search near specific landmarks/zones)
CREATE TABLE IF NOT EXISTS search_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    case_id UUID REFERENCES missing_persons(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Assigned', -- Assigned, Searching, Completed, Cancelled
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- Sighting_Alert, Status_Update, Assignment
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs table (Compliance, tracking all operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Can be NULL for public operations
    action TEXT NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Case History table (Tracks historical changes on cases)
CREATE TABLE IF NOT EXISTS case_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES missing_persons(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id),
    old_status case_status,
    new_status case_status NOT NULL,
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index triggers for fuzzy string matching
CREATE INDEX IF NOT EXISTS missing_persons_name_trgm_idx ON missing_persons USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS missing_persons_desc_trgm_idx ON missing_persons USING gin (physical_description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS missing_persons_clothing_trgm_idx ON missing_persons USING gin (clothing_description gin_trgm_ops);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_missing_persons_modtime BEFORE UPDATE ON missing_persons FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_volunteers_modtime BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

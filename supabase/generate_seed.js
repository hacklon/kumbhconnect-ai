const fs = require('fs');
const path = require('path');

const repoDataPath = 'C:\\Users\\Shayadri\\.gemini\\antigravity\\brain\\7151f2f6-2dc4-4ecc-ad17-ebda15ea3223\\claude-impact-labs-data\\claude-impact-lab-mumbai-2026\\data';
const outputPath = path.join(__dirname, 'seed.sql');

// CSV Helper parser that handles quoted strings and escaped commas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(val => {
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        return val.replace(/""/g, '"');
    });
}

function escapeSQLString(str) {
    if (str === undefined || str === null || str === '') return 'NULL';
    return `'${str.replace(/'/g, "''")}'`;
}

function run() {
    let sqlContent = `-- Database Seed File for KumbhConnect AI\n\n`;

    // 1. Parse and insert Zones
    console.log('Parsing Zones...');
    const zonesFile = fs.readFileSync(path.join(repoDataPath, 'Zone_Boundaries.csv'), 'utf8');
    const zoneLines = zonesFile.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const zonesHeader = parseCSVLine(zoneLines[0]);
    sqlContent += `-- Seeding Zones\n`;
    for (let i = 1; i < zoneLines.length; i++) {
        const parts = parseCSVLine(zoneLines[i]);
        if (parts.length < 4) continue;
        const name = parts[0];
        const lat = parseFloat(parts[1]);
        const lng = parseFloat(parts[2]);
        const boundaryPoints = parseInt(parts[3]);
        sqlContent += `INSERT INTO zones (name, centroid_lat, centroid_lng, approx_boundary_points) VALUES (${escapeSQLString(name)}, ${lat}, ${lng}, ${boundaryPoints}) ON CONFLICT (name) DO NOTHING;\n`;
    }
    sqlContent += `\n`;

    // 2. Parse and insert Police Stations
    console.log('Parsing Police Stations...');
    const stationsFile = fs.readFileSync(path.join(repoDataPath, 'Police_Stations.csv'), 'utf8');
    const stationLines = stationsFile.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    sqlContent += `-- Seeding Police Stations\n`;
    for (let i = 1; i < stationLines.length; i++) {
        const parts = parseCSVLine(stationLines[i]);
        if (parts.length < 3) continue;
        const name = parts[0];
        const lng = parseFloat(parts[1]);
        const lat = parseFloat(parts[2]);
        sqlContent += `INSERT INTO police_stations (name, latitude, longitude) VALUES (${escapeSQLString(name)}, ${lat}, ${lng}) ON CONFLICT (name) DO NOTHING;\n`;
    }
    sqlContent += `\n`;

    // 3. Parse and insert CCTVs
    console.log('Parsing CCTV Locations...');
    const cctvFile = fs.readFileSync(path.join(repoDataPath, 'CCTV_Locations.csv'), 'utf8');
    const cctvLines = cctvFile.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    sqlContent += `-- Seeding CCTVs (First 200 for seed limit control)\n`;
    // We limit it to first 200 to prevent generating an overly massive SQL file, but feel free to do more
    const cctvLimit = Math.min(cctvLines.length, 300);
    for (let i = 1; i < cctvLimit; i++) {
        const parts = parseCSVLine(cctvLines[i]);
        if (parts.length < 3) continue;
        const cameraId = parts[0];
        const lng = parseFloat(parts[1]);
        const lat = parseFloat(parts[2]);
        // Map Z1-C1 to 'Zone Area 1'
        const zoneNum = cameraId.split('-')[0].substring(1);
        const zoneName = `Zone Area ${zoneNum}`;
        sqlContent += `INSERT INTO cctv (camera_id, zone_name, latitude, longitude) VALUES (${escapeSQLString(cameraId)}, ${escapeSQLString(zoneName)}, ${lat}, ${lng}) ON CONFLICT (camera_id) DO NOTHING;\n`;
    }
    sqlContent += `\n`;

    // Helper map for last seen locations to Zone Area names
    function getZoneForLocation(loc) {
        loc = loc.toLowerCase();
        if (loc.includes('trimbakeshwar') || loc.includes('trimbak')) return 'Zone Area 1';
        if (loc.includes('ramkund') || loc.includes('ghat')) return 'Zone Area 30';
        if (loc.includes('panchavati') || loc.includes('circle')) return 'Zone Area 31';
        if (loc.includes('sadhugram') || loc.includes('gate')) return 'Zone Area 8';
        if (loc.includes('takli sangam') || loc.includes('sangam')) return 'Zone Area 21';
        if (loc.includes('adgaon')) return 'Zone Area 2';
        if (loc.includes('rajur')) return 'Zone Area 25';
        if (loc.includes('madsangvi')) return 'Zone Area 6';
        if (loc.includes('dasak')) return 'Zone Area 11';
        if (loc.includes('gauri patangan')) return 'Zone Area 29';
        
        // Return a deterministic fallback zone from 1 to 32 based on string length
        const zoneNum = (loc.length % 32) + 1;
        return `Zone Area ${zoneNum}`;
    }

    // 4. Parse and insert Missing Persons
    console.log('Parsing Missing Persons...');
    const missingFile = fs.readFileSync(path.join(repoDataPath, 'Synthetic_Missing_Persons_2500.csv'), 'utf8');
    const missingLines = missingFile.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    sqlContent += `-- Seeding Missing Persons (First 150 records)\n`;
    const missingLimit = Math.min(missingLines.length, 150);
    for (let i = 1; i < missingLimit; i++) {
        const parts = parseCSVLine(missingLines[i]);
        if (parts.length < 16) continue;
        const caseId = parts[0];
        const reportedAt = parts[1];
        const name = parts[2];
        const gender = parts[3];
        const ageBand = parts[4];
        const state = parts[5];
        const district = parts[6];
        const language = parts[7];
        const lastSeenLocation = parts[8];
        const reportingCenter = parts[9];
        const reporterMobile = parts[10];
        const physicalDescription = parts[11];
        const status = parts[12];
        const resolutionHours = parts[13] ? parseFloat(parts[13]) : null;
        const isDuplicateReport = parts[14] === 'True';
        const remarks = parts[15];

        const lastSeenZone = getZoneForLocation(lastSeenLocation);
        
        sqlContent += `INSERT INTO missing_persons (case_id, reported_at, name, gender, age_band, state, district, language, last_seen_location, last_seen_zone, reporting_center, reporter_mobile, physical_description, status, resolution_hours, is_duplicate_report, remarks) VALUES (` +
            `${escapeSQLString(caseId)}, ` +
            `TIMESTAMP ${escapeSQLString(reportedAt)}, ` +
            `${escapeSQLString(name)}, ` +
            `${escapeSQLString(gender)}, ` +
            `${escapeSQLString(ageBand)}, ` +
            `${escapeSQLString(state)}, ` +
            `${escapeSQLString(district)}, ` +
            `${escapeSQLString(language)}, ` +
            `${escapeSQLString(lastSeenLocation)}, ` +
            `${escapeSQLString(lastSeenZone)}, ` +
            `${escapeSQLString(reportingCenter)}, ` +
            `${escapeSQLString(reporterMobile)}, ` +
            `${escapeSQLString(physicalDescription)}, ` +
            `${escapeSQLString(status)}, ` +
            `${resolutionHours !== null ? resolutionHours : 'NULL'}, ` +
            `${isDuplicateReport}, ` +
            `${escapeSQLString(remarks)}` +
            `) ON CONFLICT (case_id) DO NOTHING;\n`;
    }

    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    console.log('Successfully generated seed.sql!');
}

run();

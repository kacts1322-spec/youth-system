-- members (청년 명단)
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL, -- 'M' or 'F'
  birth_date DATE,
  phone TEXT,
  is_distant BOOLEAN DEFAULT false,
  distant_location TEXT,
  is_away BOOLEAN DEFAULT false,
  away_type TEXT, -- 'study', 'military', 'other'
  away_start_date DATE,
  away_expected_return_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'away', 'inactive'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- cells (셀)
CREATE TABLE cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  name TEXT NOT NULL,
  leader_name TEXT,
  leader_member_id UUID REFERENCES members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- cell_memberships (셀 배정)
CREATE TABLE cell_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_id UUID REFERENCES cells(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  term TEXT NOT NULL
);

-- attendance (출석체크)
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  present BOOLEAN DEFAULT false,
  checked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- cell_reports (셀리더 보고서)
CREATE TABLE cell_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_id UUID REFERENCES cells(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  leader_name TEXT,
  attendee_member_ids UUID[], -- Array of member IDs
  content TEXT,
  special_notes TEXT,
  prayer_requests TEXT,
  etc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- absence_flags (장기 결석 관리)
CREATE TABLE absence_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  flagged_reason TEXT,
  flagged_date DATE DEFAULT CURRENT_DATE,
  note TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

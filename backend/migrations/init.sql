-- Create tables
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Insert default data
INSERT INTO departments (name, description) VALUES
('Placement', 'Sales team'),
('Finance', 'Finance team'),
('Aftersales', 'Aftersales team'),
('Admin', 'Admin team')
ON CONFLICT DO NOTHING;

INSERT INTO roles (name) VALUES
('Admin'),
('Placement_Maker'),
('Placement_Checker'),
('Finance_Maker'),
('Finance_Checker'),
('Aftersales_Maker'),
('Aftersales_Checker')
ON CONFLICT DO NOTHING;

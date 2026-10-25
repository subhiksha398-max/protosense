CREATE TABLE IF NOT EXISTS experiments (
  id VARCHAR(32) PRIMARY KEY, prototype VARCHAR(120), domain VARCHAR(60), component VARCHAR(120),
  category VARCHAR(60), symptom TEXT, cond_text TEXT, finding TEXT, next_test TEXT, cause TEXT,
  outcome VARCHAR(30), exp_date VARCHAR(10), fixes TEXT, is_seed TINYINT DEFAULT 0);
CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(64) PRIMARY KEY, exp_id VARCHAR(32), test TEXT, reason TEXT, support TEXT,
  expected TEXT, status VARCHAR(20) DEFAULT 'Pending', result TEXT);
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
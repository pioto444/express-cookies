import { DatabaseSync } from "node:sqlite";

const db_path = "./password.sqlite";
const db = new DatabaseSync(db_path);

db.exec(
    `CREATE TABLE IF NOT EXIST users (
        user_id              INTEGER PRIMARY KEY,
        username        VARCHAR(50) UNIQUE NOT NULL,
        email           VARCHAR(100) UNIQUE NOT NULL,
        password_hash   TEXT,
        created_at      TIMESTAMP,
        last_login      TIMESTAMP,
        role            VARCHAR(20) NOT NULL,
        is_active       BOOLEAN
    )`
)

const db_ops = {
    insert_into_users: db.prepare(
        `INSERT INTO users (username, email, password_hash, created_at, last_login, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `
    )
}
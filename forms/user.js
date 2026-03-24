import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcrypt";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id              INT PRIMARY KEY,
        username        VARCHAR(50),
        email           VARCHAR(100),
        password_hash   TEXT,
        created_at      TIMESTAMP,
        last_login      TIMESTAMP,
        role            VARCHAR(20),
        is_active       BOOLEAN
    )`
);

const db_ops = {
    add_User : db.prepare(`
        INSERT INTO users (username, email, password_hash, created_at, last_login, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    delete_User : db.prepare(`
        DELETE FROM users WHERE id = ?
    `),
    update_User : db.prepare(`
        UPDATE users SET username = ?, email = ?, password_hash = ?, last_login = ?, role = ?, is_active = ?
        WHERE id = ?
    `),
}

function add_Admin() {
    const username = process.env.admin-username;
    const email = process.env.admin-email;
    const passwordHash = bcrypt.hashSync(process.env.admin-password, 10);
    const createdAt = new Date().toISOString();
    const lastLogin = createdAt;
    const role = "admin";
    const isActive = true;

    db_ops.add_User.run(username, email, passwordHash, createdAt, lastLogin, role, isActive);
}

function add_User(username, email, password) {         
        const createdAt = new Date().toISOString();
        const lastLogin = createdAt;
        const role = "user";
        const isActive = true;

        db_ops.add_User.run(username, email, password, createdAt, lastLogin, role, isActive);
}

function delete_User(id) {
    db_ops.delete_User.run(id);
}

function update_User(id, username, email, password, lastLogin, role, isActive) {
    db_ops.update_User.run(username, email, password, lastLogin, role, isActive, id);
}

export { 
    add_User,
    delete_User,
    update_User
};
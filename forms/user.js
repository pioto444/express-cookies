import { DatabaseSync } from "node:sqlite";
import argon2 from "argon2";

const db_path = "./recipes.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        email           VARCHAR(100) UNIQUE,
        username        VARCHAR(100) UNIQUE,
        password_hash   TEXT,
        created_at      TIMESTAMP,
        last_login      TIMESTAMP,
        role            VARCHAR(20),
        is_active       BOOLEAN
    )`
);

const userQueries = {
    add_User : `
        INSERT INTO users (email, username, password_hash, created_at, last_login, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    add_Admin : `
        INSERT OR IGNORE INTO users (email, username, password_hash, created_at, last_login, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    delete_User : `
        DELETE FROM users WHERE id = ?
    `,
    update_User : `
        UPDATE users SET email = ?, username = ?, password_hash = ?, last_login = ?, role = ?, is_active = ?
        WHERE id = ?
    `,
    check_For_User : `
        SELECT * FROM users WHERE email = ? OR username = ?
    `,
    get_All_Users : `
        SELECT id, email, username, role, created_at, last_login 
        FROM users 
        ORDER BY email ASC
    `,
    get_User_Id : `
        SELECT id FROM users WHERE email = ?
    `,
    get_UserById : `
        SELECT id, email, username, password_hash, role, created_at, last_login 
        FROM users 
        WHERE id = ?
    `
}

function add_Admin(email, username, passwordHash) {
    const createdAt = new Date().toISOString();
    const lastLogin = createdAt;
    const role = "admin";
    const isActive = 1;

    db.prepare(userQueries.add_Admin).run(email, username, passwordHash, createdAt, lastLogin, role, isActive);
}

async function add_User(email, username, password) {
    const passwordHash = typeof password === "string" && password.startsWith("$argon2") ? password : await argon2.hash(password);
    const createdAt = new Date().toISOString();
    const lastLogin = createdAt;
    const role = "user";
    const isActive = 1;

    db.prepare(userQueries.add_User).run(email, username, passwordHash, createdAt, lastLogin, role, isActive);
}

function delete_User(id) {
    db.prepare(userQueries.delete_User).run(id);
}

async function update_User(id, email, username, password, lastLogin, role, isActive) {
    const passwordHash = typeof password === "string" && password.startsWith("$argon2") ? password : await argon2.hash(password);
    db.prepare(userQueries.update_User).run(email, username, passwordHash, lastLogin, role, isActive, id);
}

function getUser(identifier) {
    if (!identifier) return null;
    const user = db.prepare(userQueries.check_For_User).get(identifier, identifier);
    if (!user) return null;

    user.passwordHash = user.password_hash;
    return user;
}

function getAdmin(email, password) {
    return (email === process.env.ADMIN_EMAIL) && argon2.verify(process.env.ADMIN_PASSWORD, password);
}

function getAllUsers() {
    return db.prepare(userQueries.get_All_Users).all();
}

function getUserId(email) {
    const row = db.prepare(userQueries.get_User_Id).get(email);
    return row ? row.id : null;
}

function getUserById(id) {
    return db.prepare(userQueries.get_UserById).get(id);
}

export { 
    add_User,
    delete_User,
    update_User,
    getUser,
    getAdmin,
    add_Admin,
    getAllUsers,
    getUserId,
    getUserById
};
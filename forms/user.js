import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcrypt";

const db_path = "./recipes.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        email           VARCHAR(100) UNIQUE,
        password_hash   TEXT,
        created_at      TIMESTAMP,
        last_login      TIMESTAMP,
        role            VARCHAR(20),
        is_active       BOOLEAN
    )`
);

const db_ops = {
    add_User : db.prepare(`
        INSERT INTO users (email, password_hash, created_at, last_login, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    add_Admin : db.prepare(`
        INSERT OR IGNORE INTO users (email, password_hash, created_at, last_login, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    delete_User : db.prepare(`
        DELETE FROM users WHERE id = ?
    `),
    update_User : db.prepare(`
        UPDATE users SET email = ?, password_hash = ?, last_login = ?, role = ?, is_active = ?
        WHERE id = ?
    `),
    check_For_User : db.prepare(`
        SELECT * FROM users WHERE email = ?
    `),
    get_All_Users : db.prepare(`
        SELECT id, email, role, created_at, last_login 
        FROM users 
        ORDER BY email ASC
    `)
}

function add_Admin() {
    const email = process.env.admin-email;
    const adminPlain = process.env.admin-password || "";
    const passwordHash = bcrypt.hashSync(adminPlain, 10);
    const createdAt = new Date().toISOString();
    const lastLogin = createdAt;
    const role = "admin";
    const isActive = 1;

    db_ops.add_Admin.run(email, passwordHash, createdAt, lastLogin, role, isActive);
}

function add_User(email, password) {  
    
        const passwordHash = typeof password === "string" && password.startsWith("$2") ? password : bcrypt.hashSync(password, 10);
        const createdAt = new Date().toISOString();
        const lastLogin = createdAt;
        const role = "user";
        const isActive = 1;

        db_ops.add_User.run(email, passwordHash, createdAt, lastLogin, role, isActive);
}

function delete_User(id) {
    db_ops.delete_User.run(id);
}

function update_User(id, email, password, lastLogin, role, isActive) {
    const passwordHash = typeof password === "string" && password.startsWith("$2") ? password : bcrypt.hashSync(password, 10);
    db_ops.update_User.run(email, passwordHash, lastLogin, role, isActive, id);
}

function getUser(email) {
    const user =  db_ops.check_For_User.get(email);
    if (!user) return null;

    user.passwordHash = user.password_hash;
    return user;
}

function getAdmin(email, password) {
    return (email === process.env.ADMIN_EMAIL) && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD);
}

function getAllUsers() {
    return db_ops.get_All_Users.all();
}

export { 
    add_User,
    delete_User,
    update_User,
    getUser,
    getAdmin,
    add_Admin,
    getAllUsers
};
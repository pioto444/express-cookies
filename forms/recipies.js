import { get } from "node:http";
import { DatabaseSync } from "node:sqlite";

const db_path = "./recipes.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL,
        user_email  VARCHAR(100) NOT NULL,   
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        name      TEXT NOT NULL,
        amount    TEXT,

        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS instructions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id       INTEGER NOT NULL,
        instruction_num INTEGER NOT NULL,
        instruction     TEXT NOT NULL,

        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
`);

const db_ops = {
    add_Ingredient : db.prepare(`
        INSERT INTO ingredients (recipe_id, name, amount)
        VALUES (?, ?, ?)
    `),
    add_Recipe : db.prepare(`
        INSERT INTO recipes (name, user_email)
        VALUES (?, ?)
    `),
    get_Recipes : db.prepare(`
        SELECT id, name FROM recipes
    `),
    get_RecipesByUser : db.prepare(`
        SELECT id, name FROM recipes 
        WHERE user_email = ? 
        ORDER BY name
    `),
    get_Recipe_Details : db.prepare(`
        SELECT r.name AS recipe_name, i.name AS ingredient_name, i.amount, s.instruction_num, s.instruction
        FROM recipes r
        LEFT JOIN ingredients i ON r.id = i.recipe_id
        LEFT JOIN instructions s ON r.id = s.recipe_id
        WHERE r.id = ?
        ORDER BY s.instruction_num
    `),
    get_Recipe_For_Edit : db.prepare(`
        SELECT id, name, user_email 
        FROM recipes 
        WHERE id = ?
    `),
    update_Recipe : db.prepare(`
        UPDATE recipes 
        SET name = ? 
        WHERE id = ?
    `)
};

function add_Recipe(name, userEmail) {
if (!userEmail) throw new Error("userEmail is required when adding recipe");
    const result = db_ops.add_Recipe.run(name, userEmail);
    return result.lastInsertRowid;
}

function get_Recipes() {
    return db_ops.get_Recipes.all();
}

function get_Recipes_By_User(email) {
    return db_ops.get_RecipesByUser.all(email);
}

function get_Recipe_Details(recipeId) {
    return db_ops.get_Recipe_Details.all(recipeId);
}

function get_Recipe_For_Edit(recipeId) {
    return db_ops.get_Recipe_For_Edit.get(recipeId);
}

function update_Recipe(recipeId, name) {
    db_ops.update_Recipe.run(name, recipeId);
}

export { 
    add_Recipe,
    get_Recipes,
    get_Recipes_By_User,
    get_Recipe_Details,
    get_Recipe_For_Edit,
    update_Recipe
};
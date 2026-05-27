import { DatabaseSync } from "node:sqlite";

const db_path = "./recipes.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

const recipeQueries = {
    add_Ingredient : `
        INSERT INTO ingredients (recipe_id, name, amount)
        VALUES (?, ?, ?)
    `,
    add_Instruction : `
        INSERT INTO instructions (recipe_id, instruction_num, instruction)
        VALUES (?, ?, ?)
    `,
    add_Recipe : `
        INSERT INTO recipes (name, user_id, user_email)
        VALUES (?, ?, ?)
    `,
    get_Recipes : `
        SELECT id, name, user_email FROM recipes
    `,
    get_RecipesByUserId : `
        SELECT id, name, user_email FROM recipes 
        WHERE user_id = ? 
        ORDER BY name
    `,
    get_Recipe_Name : `
        SELECT name FROM recipes WHERE id = ?
    `,
    get_Recipe_Ingredients : `
        SELECT name, amount FROM ingredients WHERE recipe_id = ?
    `,
    get_Recipe_Instructions : `
        SELECT instruction_num, instruction FROM instructions WHERE recipe_id = ?
        ORDER BY instruction_num
    `,
    get_Recipe_For_Edit : `
        SELECT id, name, user_email 
        FROM recipes 
        WHERE id = ?
    `,
    update_Recipe : `
        UPDATE recipes 
        SET name = ? 
        WHERE id = ?
    `,
    delete_Recipe : `
        DELETE FROM recipes WHERE id = ?
    `
};

function add_Ingredient(recipeId, name, amount) {
    db.prepare(recipeQueries.add_Ingredient).run(recipeId, name, amount || null);
}

function add_Instruction(recipeId, instructionNum, instruction) {
    db.prepare(recipeQueries.add_Instruction).run(recipeId, instructionNum, instruction);
}

function add_Recipe(name, userId, userEmail) {
    if (!userEmail) throw new Error("userEmail is required when adding recipe");
    const result = db.prepare(recipeQueries.add_Recipe).run(name, userId, userEmail);
    return result.lastInsertRowid;
}

function get_Recipes() {
    return db.prepare(recipeQueries.get_Recipes).all();
}

function get_Recipes_By_User_ID(user_ID) {
    return db.prepare(recipeQueries.get_RecipesByUserId).all(user_ID);
}

function get_Recipe_Details(recipeId) {
    const recipeRow = db.prepare(recipeQueries.get_Recipe_Name).get(recipeId);
    if (!recipeRow) return [];
    
    const ingredients = db.prepare(recipeQueries.get_Recipe_Ingredients).all(recipeId);
    const instructions = db.prepare(recipeQueries.get_Recipe_Instructions).all(recipeId);
    
    // Return combined result in the original format for backward compatibility
    const result = [];
    const maxLength = Math.max(ingredients.length, instructions.length);
    
    for (let i = 0; i < maxLength; i++) {
        result.push({
            recipe_name: recipeRow.name,
            ingredient_name: ingredients[i]?.name || null,
            amount: ingredients[i]?.amount || null,
            instruction_num: instructions[i]?.instruction_num || null,
            instruction: instructions[i]?.instruction || null
        });
    }
    
    return result.length > 0 ? result : [{
        recipe_name: recipeRow.name,
        ingredient_name: null,
        amount: null,
        instruction_num: null,
        instruction: null
    }];
}

function get_Recipe_For_Edit(recipeId) {
    return db.prepare(recipeQueries.get_Recipe_For_Edit).get(recipeId);
}

function update_Recipe(name, recipeId) {
    db.prepare(recipeQueries.update_Recipe).run(name, recipeId);
}

function delete_Recipe(recipeId) {
    db.prepare(recipeQueries.delete_Recipe).run(recipeId);
}

export { 
    add_Ingredient,
    add_Instruction,
    add_Recipe,
    get_Recipes,
    get_Recipes_By_User_ID,
    get_Recipe_Details,
    get_Recipe_For_Edit,
    update_Recipe,
    delete_Recipe
};
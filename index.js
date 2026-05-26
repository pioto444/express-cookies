import  express  from "express";
import "dotenv/config";
import argon2 from "argon2";
import { add_User, getUser, getAllUsers, add_Admin, getUserId, getUserById } from "./forms/user.js";
import { 
    add_Ingredient,
    add_Instruction,
    add_Recipe, 
    get_Recipes, 
    get_Recipes_By_User_ID, 
    get_Recipe_Details,
    get_Recipe_For_Edit,
    update_Recipe,
} from "./forms/recipies.js";
import session from "express-session";


const port = process.env.PORT;
const app = express();

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 3
    }
}));

app.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
}); 

app.get("/signup", (req, res) => {
    res.render("signup", { title: "Sign up" });
});

app.post("/signup", async (req, res) => {
    const user = getUser(req.body.email || req.body.username);

    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).send("Passwords do not match");  
    }
    else if (user) {
        return res.status(400).send("User already exists");
    }
    else if (req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD) {
        const email = req.body.email;
        const username = req.body.username;
        const passwordHash = await argon2.hash(req.body.password);
        add_Admin(email, username, passwordHash);
    }
    else {
        const email = req.body.email;
        const username = req.body.username;
        const passwordHash = await argon2.hash(req.body.password);

        await add_User(email, username, passwordHash);
    }
    res.redirect("/login");
});


app.get("/add-recipe", (req, res) => {
    res.render("add-recipe", { title: "Add Recipe" });
});

app.post("/add-recipe", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const name = req.body.name?.trim();
    if (!name) return res.status(400).send("Recipe name is required");

    const recipeId = add_Recipe(name, req.session.user.id, req.session.user.email);
    const userID = getUserId(req.session.user.email);

    res.redirect(`/recipes/${userID}/${recipeId}`);
});

app.get("/recipes/:userID/:id", (req, res) => {
    if (req.session.user.id != req.params.userID) {
        return res.redirect("/login");
    }

    const recipeId = req.params.id;
    const userEmail = req.params.userEmail;
    const recipeDetails = get_Recipe_Details(recipeId);

    if (!recipeDetails || recipeDetails.length === 0) {
        return res.status(404).render("recipe", {
            title: "Recipe not found",
            recipe: { name: "Unknown", ingredients: [], instructions: [] }
        });
    }

    const recipeName = recipeDetails[0].recipe_name || "Untitled";
    const ingredients = recipeDetails
        .filter(r => r.ingredient_name)
        .map(r => ({ name: r.ingredient_name, amount: r.amount }));
    const instructions = recipeDetails
        .filter(r => r.instruction)
        .sort((a,b) => a.instruction_num - b.instruction_num)
        .map(r => ({ step: r.instruction_num, text: r.instruction }));

    return res.render("recipe", {
        title: recipeName,
        recipe: { id: recipeId, name: recipeName, ingredients, instructions },
        userEmail: userEmail
    });
});

app.get("/recipes/:userID/:id/edit", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).send("Only admin can edit recipes.");
    }

    const recipeId = parseInt(req.params.id);
    const userEmail = req.params.userEmail;
    const userID = parseInt(req.params.userID);
    const recipe = get_Recipe_For_Edit(recipeId);

    if (!recipe) {
        return res.status(404).send("Recipe not found");
    }

    res.render("edit-recipe", { 
        title: `Edit Recipe: ${recipe.name}`,
        recipe: recipe,
        userEmail: userEmail,
        userID: userID,
        user: req.session.user
    });
});

app.get("/welcome", (req, res) => {
    if (req.session.user && req.session.user.role === "admin") {
        const userRecipes = get_Recipes_By_User_ID(req.session.user.id);
        const allUsers = getAllUsers();
        const user_ID = req.session.user.id;

        res.render("welcome", { 
            title: "Admin Panel – All Users",
            username: req.session.user.email,
            role: "admin",
            users: allUsers,
            user_ID: user_ID,
            isAdmin: true,
            isAdminViewingUser: false,
            recipes: [],
            viewedUserEmail: null
        });
    } else {
        const user_ID = req.session.user.id;
        console.log("User ID in /welcome route:", user_ID);

        console.log(recipes);
        
        const recipes = get_Recipes_By_User_ID(user_ID);
        res.render("welcome", { 
            title: "Welcome", 
            user_recipes: recipes.filter(r => r.user_ID === req.session.user.id),
            username: req.session.user.email,
            user_ID: user_ID,
            role: req.session.user.role,
            recipes: recipes,
            isAdmin: false,
            isAdminViewingUser: null,
            users: []
        });
    }
});

app.post("/welcome", async (req, res) => { 
    const user = getUser(req.body.email || req.body.username);
    const validPassword = user ? await argon2.verify(user.passwordHash, req.body.password) : false;

    if (!user || !validPassword) {
        return res.status(401).send("Invalid credentials");
    }

    const allUsers = user.role === "admin" ? getAllUsers() : [];

    // === SESSION CREATION (secure way) ===
    req.session.regenerate((err) => {
        // prevents session fixation attack
        if (err) {
        console.error("Session regenerate error:", err);
        return res.redirect("/welcome");
        }

        req.session.user = {
        email: user.email,
        username: user.username,
        id: user.id,
        role: user.role || "user"
        };
        console.log("User logged in successfully");

        const recipes = get_Recipes_By_User_ID(req.session.user.id);
        const user_ID = req.session.user.id;

        res.render("welcome", { 
            title: "Welcome", 
            username: user.username, 
            email: user.email,
            role: user.role || "user",
            recipes: recipes,
            users: allUsers,
            user: { email: user.email, username: user.username, role: user.role || "user" },
            user_ID: user_ID,
            isAdmin: user.role === "admin",
            isAdminViewingUser: false
        });
    });
});

app.get("/:userID/recipes", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).send("Access denied. Only admin can view other users' recipes.");
    }

    const targetUserID = parseInt(req.params.userID);
    const targetUser = getUserById(targetUserID);

    if (!targetUser) {
        return res.status(404).send("User not found");
    }

    const recipes = get_Recipes_By_User_ID(targetUserID);

    res.render("welcome", { 
        title: `Recipes of ${targetUser.email}`,
        username: targetUser.email,
        role: "admin",
        recipes: recipes,
        isAdmin: true,
        isAdminViewingUser: true,
        viewedUserEmail: targetUser.email,
        users: [],
        user_ID: targetUserID
    });
});

app.get("/recipes/:userID/:id/add-information", (req, res) => {
    if (req.session.user.id != req.params.userID) {
        return res.redirect("/login");
    }

    const recipeId = parseInt(req.params.id);
    const recipeDetails = get_Recipe_Details(recipeId);

    if (!recipeDetails || recipeDetails.length === 0) {
        return res.status(404).send("Recipe not found");
    }

    const recipe = {
        id: recipeId,
        name: recipeDetails[0].recipe_name || "Untitled",
    }

    res.render("add-information", {
        title: `Add Information to ${recipe.name}`,
        recipe: recipe,
        userID: req.params.userID
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie("connect.sid", { path: "/" });
    res.redirect("/login");
});

app.post("/recipes/:userID/:id/edit", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).send("Access denied");
    }

    const recipeId = parseInt(req.params.id);
    const userID = parseInt(req.params.userID);
    const newName = req.body.name?.trim();

    if (!newName) {
        return res.status(400).send("Recipe name cannot be empty");
    }

    update_Recipe(recipeId, newName, req.session.user.email);
    res.redirect(`/recipes/${userID}/${recipeId}`);
});

app.post("/recipes/:userID/:id/add-information", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const recipeId = parseInt(req.params.id);
    const userEmail = req.params.userEmail;

    // === SKŁADNIKI ===
    let ingredients = [];
    if (req.body.ingredients) {
        // Przypadek 1: Express sparsował jako tablicę obiektów
        if (Array.isArray(req.body.ingredients)) {
            ingredients = req.body.ingredients;
        } 
        // Przypadek 2: Tylko jeden składnik → Express daje obiekt
        else if (typeof req.body.ingredients === 'object' && req.body.ingredients !== null) {
            ingredients = [req.body.ingredients];
        }
    }

    ingredients.forEach(ing => {
        // Bezpieczne wyciągnięcie wartości
        const name   = String(ing?.name   || "").trim();
        const amount = String(ing?.amount || "").trim();

        if (name) {
            add_Ingredient(recipeId, name, amount || null);
        }
    });

    // === INSTRUKCJE ===
    let instructions = [];
    if (req.body.instructions) {
        if (Array.isArray(req.body.instructions)) {
            instructions = req.body.instructions;
        } else {
            instructions = [req.body.instructions];
        }
    }

    instructions.forEach((text, index) => {
        const instructionText = String(text || "").trim();

        if (instructionText) {
            add_Instruction(recipeId, index + 1, instructionText);
        }
    });

    res.redirect(`/recipes/${userEmail}/${recipeId}`);
});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}/`);
});
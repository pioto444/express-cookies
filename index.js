import  express  from "express";
import "dotenv/config";
import bcrypt from "bcrypt";
import { add_User, getUser, getAllUsers, add_Admin } from "./forms/user.js";
import { 
    add_Ingredient,
    add_Instruction,
    add_Recipe, 
    get_Recipes, 
    get_Recipes_By_User, 
    get_Recipe_Details,
    get_Recipe_For_Edit,
    update_Recipe
} from "./forms/recipies.js";
import cookieParser from "cookie-parser";
import settings from "./forms/settings.js";

const port = process.env.PORT;
const app = express();

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));
app.use(cookieParser(settings.cookieSecret));
app.use(express.urlencoded({ extended: true }));

function loadUser(req, res, next) {
    const userEmail = req.signedCookies.userEmail;
    if (userEmail) {
        const user = getUser(userEmail);
        if (user) {
            req.user = user;
            res.locals.user = { email: user.email, role: user.role || "user" };
        } else {
            res.clearCookie("userEmail"); // invalid cookie
        }
    }
    next();
}

function settingsLocals (req, res, next) {
    res.locals.app = settings.getAppSettings(req);
    res.locals.page = req.path;
    res.locals.user = res.locals.user || { email: "Guest", role: "user" };
    res.locals.users = [];           
    res.locals.recipes = [];
    next();
}

app.use(loadUser);
app.use(settingsLocals);

const settingsRouter = express.Router();
settingsRouter.get("/toggle-theme", settings.themeToggle);
settingsRouter.get("/accept-cookies", settings.acceptCookies);
settingsRouter.get("/decline-cookies", settings.declineCookies);
settingsRouter.get("/manage-cookies", settings.manageCookies);
app.use("/settings", settingsRouter);

app.get("/privacy-policy", (req, res) => {
    res.render("privacy-policy", { title: "Privacy Policy" });
});

app.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
});

app.get("/signup", (req, res) => {
    res.render("signup", { title: "Sign up" });
});

app.get("/add-recipe", (req, res) => {
    res.render("add-recipe", { title: "Add Recipe" });
});

app.get("/recipes/:id", (req, res) => {
    const recipeId = req.params.id;
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
        recipe: { id: recipeId, name: recipeName, ingredients, instructions }
    });
});

app.get("/recipes/:id/edit", (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Only admin can edit recipes.");
    }

    const recipeId = parseInt(req.params.id);
    const recipe = get_Recipe_For_Edit(recipeId);

    if (!recipe) {
        return res.status(404).send("Recipe not found");
    }

    res.render("edit-recipe", { 
        title: `Edit Recipe: ${recipe.name}`,
        recipe: recipe,
        user: req.user
    });
});

app.get("/welcome", (req, res) => {
if (req.user && req.user.role === "admin") {
        const allUsers = getAllUsers();
        res.render("welcome", { 
            title: "Admin Panel – All Users",
            username: req.user.email,
            role: "admin",
            users: allUsers,
            isAdmin: true,
            isAdminViewingUser: false,
            recipes: [],
            viewedUserEmail: null
        });
    } else {
        const recipes = get_Recipes();
        res.render("welcome", { 
            title: "Welcome", 
            username: res.locals.user.email,
            role: res.locals.user.role,
            recipes: recipes,
            isAdmin: false,
            isAdminViewingUser: null,
            users: []
        });
    }
});

app.get("/user/:email/recipes", (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Access denied. Only admin can view other users' recipes.");
    }

    const targetEmail = req.params.email;
    const targetUser = getUser(targetEmail);

    if (!targetUser) {
        return res.status(404).send("User not found");
    }

    const recipes = get_Recipes_By_User(targetEmail);

    res.render("welcome", { 
        title: `Recipes of ${targetEmail}`,
        username: targetEmail,
        role: "admin",
        recipes: recipes,
        isAdmin: true,
        isAdminViewingUser: true,
        viewedUserEmail: targetEmail,
        users: []
    });
});

app.get("/recipes/:id/add-information", (req, res) => {
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
        recipe: recipe
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie("userEmail");
    res.redirect("/login");
});

app.post("/signup", (req, res) => {
    const user = getUser(req.body.email);

    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).send("Passwords do not match");  
    }
    else if (user) {
        return res.status(400).send("User already exists");
    }
    else if (req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD) {
        const email = req.body.email;
        const passwordHash = bcrypt.hashSync(req.body.password, 10);
        add_Admin(email, passwordHash);
        res.redirect("/login");
    }
    else {
        const email = req.body.email;
        const passwordHash = bcrypt.hashSync(req.body.password, 10);

        add_User(email, passwordHash);
        res.redirect("/login");
    }
});

app.post("/login", (req, res) => { 
    const user = getUser(req.body.email);
    const recipes = get_Recipes();

    if (!user || !bcrypt.compareSync(req.body.password, user.passwordHash)) {
        return res.status(401).send("Invalid credentials");
    }

    const allUsers = user.role === "admin" ? getAllUsers() : [];

    res.cookie("userEmail", user.email, { 
    ...settings.CookieOptions, 
    signed: true 
    });

    res.render("welcome", { 
        title: "Welcome", 
        username: user.email, 
        role: user.role || "user",
        recipes: recipes,
        users: allUsers,
        user: { email: user.email, role: user.role || "user" },
        isAdmin: user.role === "admin",
        isAdminViewingUser: false
    });
});

app.post("/add-recipe", (req, res) => {
    if (!req.user) return res.redirect("/login");

    const name = req.body.name?.trim();
    if (!name) return res.status(400).send("Recipe name is required");

    const recipeId = add_Recipe(name, req.user.email);   

    res.redirect(`/recipes/${recipeId}`);
});

app.post("/recipes/:id/edit", (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Access denied");
    }

    const recipeId = parseInt(req.params.id);
    const newName = req.body.name?.trim();

    if (!newName) {
        return res.status(400).send("Recipe name cannot be empty");
    }

    update_Recipe(recipeId, newName, req.user.email);
    res.redirect(`/recipes/${recipeId}`);
});

app.post("/recipes/:id/add-information", (req, res) => {
    if (!req.user) return res.redirect("/login");

    const recipeId = parseInt(req.params.id);

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

    res.redirect(`/recipes/${recipeId}`);
});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}/`);
});
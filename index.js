import  express  from "express";
import "dotenv/config";
import bcrypt from "bcrypt";
import { add_User, getAdmin, getUser } from "./forms/user.js";

const port = process.env.PORT;
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
});

app.get("/signup", (req, res) => {
    res.render("signup", { title: "Sign up" });
});

app.post("/signup", (req, res) => {
    if (req.body.password !== req.body.confirm_password) {
        return res.status(400).send("Passwords do not match");  
    }
    else if (check_For_User(req.body.username, req.body.email)) {
        return res.status(400).send("User already exists");
    }
    else {
        const { username, email } = req.body;
        const passwordHash = bcrypt.hashSync(req.body.password, 10);

        add_User(username, email, passwordHash);
        res.redirect("/login");
    }
});

app.post("/login", (req, res) => { 
    const user = getUser(req.body.email);

    if (!user) {
        return res.status(401).send("User not found");
    }

    const storedHash = user.passwordHash;
    
    if (!storedHash || !bcrypt.compareSync(req.body.password, storedHash)) {
        return res.status(401).send("Invalid credentials");
    }

    const isAdmin = user.role === "admin";

    res.render("welcome", { title: "Welcome", username: user.email, role: isAdmin ? "admin" : "user" });

});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}/`);
});
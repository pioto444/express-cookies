import  express  from "express";
import "dotenv/config";
import bcrypt from "bcrypt";
import { add_User, check_For_User } from "./forms/user.js";

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
    else {
        const { username, email } = req.body;
        const passwordHash = bcrypt.hashSync(req.body.password, 10);

        add_User(username, email, passwordHash);
        res.redirect("/login");
    }
});

app.post("/login", (req, res) => { 
    if ((req.body.username === process.env.ADMIN_USERNAME || req.body.email === process.env.ADMIN_EMAIL) && bcrypt.compareSync(req.body.password, process.env.ADMIN_PASSWORD)) {
        res.render("welcome", { title: "Welcome", username: req.body.username });
    } 
    else if (check_For_User(req.body.username, req.body.email)) {
        res.render("welcome", { title: "Welcome", username: req.body.username });
    } 
    else {
        res.status(401).send("Login failed");
    }
});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}/`);
});
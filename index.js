import  express  from "express";
import "dotenv/config";
import { title } from "node:process";
import bcrypt from "bcrypt";
import { add_User } from "./forms/user.js";

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
    
});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}/`);
});
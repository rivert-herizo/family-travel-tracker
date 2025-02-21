import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123Abc567..",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];
const data = await db.query("SELECT * FROM users");
const users = data.rows;

async function checkVisisted(user_id) {
  // const result = await db.query("SELECT country_code FROM visited_countries");
  const result = await db.query("SELECT users.id, users.name, visited_countries.country_code FROM users JOIN visited_countries ON users.id = visited_countries.user_id WHERE users.id = $1", [user_id]);
 
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const user_id = currentUserId; 
  
  try {
    const countries = await checkVisisted(user_id);
    const reu = await db.query("SELECT color FROM users WHERE users.id = $1", [user_id]);
    const user_color = reu.rows[0].color;
    
    const data = await db.query("SELECT * FROM users");
    const users = data.rows;

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: user_color,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const id = currentUserId;

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, id]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if(req.body.add === "new") {
    res.render('new.ejs');
  }
  else {
    const user_id = req.body.user;
    currentUserId = user_id;  
    res.redirect("/");
  }
});


app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  try {
    const user = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id;",
      [name, color]
    );
    const user_id = user.rows[0].id;
    currentUserId = user_id;  
    const data = await db.query("SELECT * FROM users");
    const users = data.rows;


    const countries = await checkVisisted(currentUserId);
    const reu = await db.query("SELECT color FROM users WHERE users.id = $1", [currentUserId]);
    const user_color = reu.rows[0].color;

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: user_color,
    });
  } catch (err) {
    console.log("Error creating user:", err);
    res.status(500).send("Error creating new user.");
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

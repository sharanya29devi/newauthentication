const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const registerUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;

  const getRegisterUser = await db.get(registerUserQuery);

  if (getRegisterUser === undefined) {
    //create user
    let createNewUser = `
    INSERT INTO user (username, name, password, gender, location)
    VALUES 
        ('${username}',
        '${name}',
        '${hashedPassword}',
        '${gender}',
        '${location}');`;

    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createNewUser);
      response.send("User created successfully");
    }
  } else {
    //user already exists
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    //Invalid User
    response.status(400);
    response.send("Invalid user");
  } else {
    //Check Password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    console.log(typeof dbUser.password);
    console.log(typeof password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const putChangePwQuery = `
  SELECT * FROM user
  WHERE username = '${username}';`;

  const getPw = await db.get(putChangePwQuery);

  if (getPw === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const checkPassword = await bcrypt.compare(oldPassword, getPw.password);

    if (checkPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        //update password
        const enPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
          UPDATE user
          SET password = '${enPassword}'
          WHERE username = '${username}';`;
        await db.run(updatePassword);
        response.send("Password updated");
      }
    } else {
      //invalid password
      response.status(400);
      response.send("Invalid Current Password");
    }
  }
});

module.exports = app;

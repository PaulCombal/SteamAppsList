const express = require('express')
const app = express()
let port = 3000;

if (process.env._ && process.env._.indexOf("heroku")) {
    console.log("I'm in Heroku!");
    port = 80;
}

app.all('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
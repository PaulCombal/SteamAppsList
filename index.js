const express = require('express')
const app = express()
const port = process.env.HEROKU ? process.env.PORT : 3000;

app.all('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
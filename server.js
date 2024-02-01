const express = require("express");
const app = express();

app.use("/gen", express.static("gen"))
app.use("/ico", express.static("ico"))
app.use("/img", express.static("img"))
app.use("/fonts", express.static("fonts"))

//Debug
app.use("/js", express.static("js"))
app.use("/css", express.static("css"))
app.use("/templates", express.static("templates"))

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.get("*", function( req, res ) {
    res.sendFile(__dirname + "/index.html")
})

app.get("/manifest_hack", (req, res) => {
    res.sendFile(__dirname + "/manifest_hack.html")
})

app.listen(process.env.PORT || 3000)
console.log("Started");
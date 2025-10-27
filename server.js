const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public")); // serve your HTML, CSS, JS from /public

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

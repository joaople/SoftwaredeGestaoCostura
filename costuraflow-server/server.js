const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Rota de teste, só pra confirmar que o servidor está de pé
app.get("/", (req, res) => {
  res.json({ status: "CosturaFlow API rodando 🧵" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

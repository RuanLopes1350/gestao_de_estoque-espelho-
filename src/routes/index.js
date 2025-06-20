import express from "express";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import rotasProdutos from "./produtoRoutes.js";
import rotasFornecedores from "./fornecedorRoutes.js";
import rotasUsuarios from "./usuarioRoutes.js";
import rotasMovimentacoes from './movimentacaoRoutes.js';
import rotasAuth from './authRoutes.js';
import rotasLogs from './logRoutes.js';
import dotenv from "dotenv";

dotenv.config();

const routes = (app) => {
  
  // Rota para encaminhar da raiz para /login
  app.get("/", (req, res) => {
    res.redirect("/login");
  });

  // Rotas públicas (não necessitam de autenticação)
  app.use("/auth", express.json(), rotasAuth);
  
  // Rotas protegidas (precisam de autenticação)
  app.use("/api/produtos", express.json(), authMiddleware, rotasProdutos);
  app.use("/api/fornecedores", express.json(), authMiddleware, rotasFornecedores);
  app.use("/api/usuarios", express.json(), authMiddleware, rotasUsuarios);
  app.use("/api/movimentacoes", express.json(), authMiddleware, rotasMovimentacoes);
  app.use("/api/logs", express.json(), rotasLogs); // Logs já têm authMiddleware internamente

  // Se não é nenhuma rota válida, produz 404
  app.use((req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
  });
};

export default routes;
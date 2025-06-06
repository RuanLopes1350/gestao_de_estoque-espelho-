import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import getSwaggerOptions from "../docs/config/head.js";
import logRoutes from "../middlewares/LogRoutesMiddleware.js";
import rotasProdutos from "./produtoRoutes.js";
import rotasFornecedores from "./fornecedorRoutes.js";
import rotasUsuarios from "./usuarioRoutes.js"
import rotasMovimentacoes from './movimentacaoRoutes.js';


import dotenv from "dotenv";

// importar as rotas/endpoints

dotenv.config();

const routes = (app) => {
  if (process.env.DEBUGLOG) {
    app.use(logRoutes);
  }
  // rota para encaminhar da raiz para /docs
  app.get("/", (req, res) => {
    res.redirect("/docs");
  });

  const swaggerDocs = swaggerJsDoc(getSwaggerOptions());
  app.use(swaggerUI.serve);
  app.get("/docs", (req, res, next) => {
    swaggerUI.setup(swaggerDocs)(req, res, next);
  });

  app.use(express.json(),
    rotasProdutos,
    rotasFornecedores,
    rotasUsuarios,
    rotasMovimentacoes
  );

  app.use('/produtos/*', (req, res) => {
    res.status(404).json({ 
      message: "Rota de produto não encontrada",
      path: req.originalUrl 
    });
  });

  // Se não é nenhuma rota válida, produz 404
  app.use((req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
  });
};

export default routes;

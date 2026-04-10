import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import reservaRoutes from "./routes/reservaRoutes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        ok: true,
        msg: "Servidor de Agendo Beta funcionando."
    });
});

app.use("/auth", authRoutes);
app.use("/reservas", reservaRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

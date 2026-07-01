const express = require("express");
const WebSocket = require("ws");
const db = require("./firebase-admin");

const app = express();

app.get("/", (req, res) => {
    res.send("Servidor Willay activo");
});

const PORT = process.env.PORT || 3000;

const servidor = app.listen(PORT, () => {
    console.log("Servidor iniciado en el puerto " + PORT);
});

const wss = new WebSocket.Server({
    server: servidor
});

wss.on("connection", (ws) => {

    console.log("Cliente conectado");

    ws.on("message", async (mensaje) => {

        try {

            const datos = JSON.parse(mensaje.toString());

            console.log("Mensaje recibido:", datos);

            if(datos.tipo === "UID"){

                console.log("UID recibido desde app:", datos.uid);

                wss.clients.forEach(cliente => {
                    if(cliente.readyState === WebSocket.OPEN){
                        cliente.send(JSON.stringify(datos));
                    }
                });

                return;
            }

            if(datos.tipo === "RFID"){

                await db
                    .collection("usuarios")
                    .doc(datos.uid)
                    .collection("practicas")
                    .add({

                        fecha: new Date(),
                        timestamp: Date.now(),

                        tipo: "RFID",
                        modo: datos.modo,

                        duracion: datos.duracion,
                        aciertos: datos.aciertos,
                        errores: datos.errores,

                        erroresDetalle: datos.erroresDetalle || {},

                        totalPreguntas: datos.aciertos + datos.errores,

                        porcentaje:
                        (datos.aciertos + datos.errores) === 0
                        ? 0
                        : Math.round(datos.aciertos / (datos.aciertos + datos.errores) * 100),

                        dispositivo: "ESP32",
                        version: "1.0"

                    });

                console.log("Práctica RFID guardada en Firestore");

                ws.send(JSON.stringify({
                    estado: "ok",
                    mensaje: "Practica guardada"
                }));

                return;
            }

        } catch(error) {

            console.error("Error:", error);

            ws.send(JSON.stringify({
                estado: "error",
                mensaje: error.message
            }));

        }

    });

    ws.on("close", () => {
        console.log("Cliente desconectado");
    });

});

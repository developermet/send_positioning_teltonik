// app.js
const express = require("express");
const axios = require("axios");
const https = require("https");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("¡Hola, mundo!");
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

async function miFuncion() {
  console.log("Esta función se ejecutará cada 5 segundos");
  /**
   * Get gps data lat and lng from ubus router
   * @param req
   * @param res
   */

  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    const data =
      '{"jsonrpc":"2.0", "id":1, "method":"call", "params":[ "00000000000000000000000000000000", "session", "login",{"username":"admin", "password":"Met.its2022"}]}';
    const resp = await axios
      .post("https://10.100.100.254/ubus", data, {
        httpsAgent: agent,
        timeout: 2000,
      })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error);
        return error;
      });

    const token = resp.data.result[1].ubus_rpc_session;

    /***/
    const bodyInfoDevice = `{
        "jsonrpc": "2.0", "id": 1, "method": "call", "params":
        [
            "${token}","file", "exec",
            {
                "command":"mnf_info", "params":["--mac","--name","--sn"]  
            }
    
        ]
    }`;

    const getInfoDevice = await axios
      .post("https://10.100.100.254/ubus", JSON.parse(bodyInfoDevice), {
        httpsAgent: agent,
        timeout: 2000,
      })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error);
        return error;
      });

    let routerInfo = getInfoDevice.data.result[1].stdout;
    //Device Info
    var mac = routerInfo.split("\n")[0];
    var name = routerInfo.split("\n")[1];
    var serialNumber = routerInfo.split("\n")[2];
    console.log(
      "🚀 ~ file: index.js:75 ~ miFuncion ~ ROUTER_INFO:",
      mac,
      name,
      serialNumber
    );

    /***/

    const body = `{"jsonrpc": "2.0", "id": 1, "method": "call", "params": ["${token}", "file", "exec", {"command":"gpsctl", "params":["-ixave"]}]}`;

    const getGPSdata = await axios
      .post("https://10.100.100.254/ubus", JSON.parse(body), {
        httpsAgent: agent,
        timeout: 2000,
      })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error);
        return error;
      });

    let coordinates = getGPSdata.data.result[1].stdout;

    if (!coordinates || coordinates == null) {
      console.log("Record could not be saved, error post router");
      return "Record could not be saved, error post router";
    }

    const datosString = coordinates;

    // Utiliza una expresión regular para extraer la fecha y hora
    const regex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/;
    const coincidencia = datosString.match(regex);
    let fechaFormateada;
    if (coincidencia) {
      // La primera captura en la expresión regular contiene la fecha y hora
      const fechaHora = coincidencia[1];

      // Crea un objeto Date utilizando la cadena de fecha y hora
      const fecha = new Date(fechaHora);

      // Puedes formatear la fecha según tus necesidades
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      const dia = String(fecha.getDate()).padStart(2, "0");
      const horas = String(fecha.getHours()).padStart(2, "0");
      const minutos = String(fecha.getMinutes()).padStart(2, "0");
      const segundos = String(fecha.getSeconds()).padStart(2, "0");

      fechaFormateada = `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
    } else {
      console.log("No se encontró ninguna fecha y hora en el string.");
    }

    const lat = coordinates.split("\n")[0];
    const lng = coordinates.split("\n")[1];
    const speed = coordinates.split("\n")[2];

    console.log(
      "🚀 ~ file: index.js:107 ~ miFuncion ~ coordinates LAT - LNG -SPEED, TIMESTAMP",
      lat,
      lng,
      speed,
      fechaFormateada
    );

    const bodyWifi = `{"jsonrpc": "2.0", "id": 1, "method": "call", "params": ["${token}", "iwinfo", "info", 
        {
            "device":"wlan0"
        }
    ]}`;

    const getWifiData = await axios
      .post("https://10.100.100.254/ubus", JSON.parse(bodyWifi), {
        httpsAgent: agent,
        timeout: 2000,
      })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error);
        return error;
      });

    const wifiData = getWifiData.data.result[1];
    const ssid = getWifiData.data.result[1].ssid;

    // Extrae la porción de la cadena después del patrón
    const busId = ssid.split("_")[1];
    console.log("🚀 ~ file: index.js:139 ~ miFuncion ~ busId:", busId);

    const structureUpdateMap = {
      time: fechaFormateada,
      lat: lat,
      lon: lng,
      speed: speed,
      busId: busId,
    };
    console.log(
      "🚀 ~ file: index.js:173 ~ miFuncion ~ structureUpdateMap:",
      structureUpdateMap
    );

    const postUpdateMap = await axios
      .post("http://10.100.100.250/updatemap", structureUpdateMap, {
        httpsAgent: agent,
        timeout: 3000,
      })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error);
        return error;
      });

    //return res.status(200).json(responseReturn);
    return true;
  } catch (error) {
    console.log(
      "🚀 ~ file: vehicleTracking.controller.ts:346 ~ getGpsDataUbus ~ error:",
      error
    );

    return error;
  }
}

// Establecer el intervalo en 5000 milisegundos (5 segundos)
setInterval(miFuncion, 5000);

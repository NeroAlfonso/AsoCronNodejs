var request =require("request");
var oraBase =require("oracledb");
oraBase.fetchAsString = [ oraBase.CLOB ];
//Credenciales BD
var oraCredencialesAso =require("./config-base").asoportuguesa
.prod;
//.test;
var oraCredencialesAsopr =require("./config-base").asoproductos
.prod;
//Queries BD
var oraQueriesAso =require("./queries-base").asoportuguesa;
var oraQueriesAsopr =require("./queries-base").asoproductos;
//Lista de API's a usar
var listaApis =require("./lista-apis.js");
var CronJob =require('cron').CronJob;
async function obtConexion(credenciales)
{//obtener conexion con la base de dato
    oraConn = await oraBase.getConnection({
        user			:credenciales.usuario,
        password		:credenciales.contrasenia,
        connectString	:credenciales.cadenaConn
    })
    .catch((error)=>{
        console.error('Error instanciando la base de datos:');
        console.error(error);
        //process.exit();
        return;
    });
    return oraConn;
}
async function actualizarTasaDTAso(body)
{
    let oraConnAso = await obtConexion(oraCredencialesAso);
    opciones  ={
        outFormat: oraBase.OBJECT,
        autoCommit: true
    }
    try
    {
        let respUltVal = await oraConnAso.execute(oraQueriesAso.ultValTasaDolarDicom, {}, opciones); 
        let ultVal =respUltVal.rows[0].VA_VARIABLE;
        //debug
        console.log('resultado del ultimo valor de la tasa:');
        console.log(ultVal);
        if(ultVal != body.USD.sicad2)
        {//si el ultimo valor de la tasa es distinto al recibido por el API, se actualiza
            let respIns = await oraConnAso.execute(oraQueriesAso.actTasaDolarDicom, [body.USD.sicad2], opciones);
            //debug
            console.log('resultado del insert:');
            console.log(respIns);
        }
    }
    catch(e)
    {
        console.error('Error en actTasaDolarDicom:');
        console.error(e);
        //process.exit();
        return;
    }
}
async function actualizarTasaDT()
{//actualiza las tasas
    request(
        listaApis.DTAPI,
        {
            json: true
        },
        async (err, res, body) =>
        {
            if(err)
            {
                console.error('Error en la consulta a DTAPI:');
                console.error(err);
                //process.exit();
                return;
            }
            actualizarTasaDTAso(body);
            //actualizarTasaDTAsopr(body);
            //debug
            console.log('sicad1', body.USD.sicad1);
            console.log('sicad2', body.USD.sicad2); //correcto
            console.log(body._timestamp.fecha);
            console.log(Date());
        }
    );
}
//debug
console.log('Inicio de la tarea V1:');
console.log(Date());
//Tarea programada cada 10 min actualiza la tasa dolar dicom
new CronJob(
    //'* * * * * *',     //verifica cada segundo
    //'0 */10 * * * *', //verifica cada 10 minutos
    //'0 7 * * *',        //verifica cada dia a las 7 am
    '0 11 * * *',        //verifica cada dia a las 11 am
    actualizarTasaDT,
    function()
    {
        console.log('termino la tarea');
    },
    true
);
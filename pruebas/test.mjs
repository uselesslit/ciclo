// Banco de pruebas de la entrega 1. Ejecuta el JS real de index.html con un DOM falso.
// Uso: TZ=America/Lima node test.mjs
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("/home/failed/gastos/index.html", "utf8");
const src  = html.split("<script>")[1].split("</script>")[0];

/* ---- reloj congelado: 13 ago 2026, 23:30 en Lima = 14 ago 04:30 UTC ---- */
const INSTANTE = Date.parse("2026-08-14T04:30:00Z");
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a){ super(...(a.length ? a : [INSTANTE])); }
  static now(){ return INSTANTE; }
}
globalThis.Date = FakeDate;

/* ---- DOM falso ---- */
const el = () => ({
  textContent:"", innerHTML:"", value:"", max:"", hidden:false, disabled:false,
  style:{}, dataset:{}, attrs:{}, children:[],
  classList:{ _s:new Set(),
    add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
    toggle(c,f){ f === undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (f?this._s.add(c):this._s.delete(c)) },
    contains(c){return this._s.has(c)} },
  setAttribute(k,v){this.attrs[k]=String(v)}, getAttribute(k){return this.attrs[k]},
  appendChild(c){this.children.push(c); return c}, append(...c){this.children.push(...c)},
  focus(){}, click(){}, onclick:null, onchange:null, oninput:null, onblur:null,
  addEventListener(){}, removeEventListener(){}, remove(){},
  querySelectorAll(){ return []; },
  getBoundingClientRect(){ return { left:0, top:0, width:60, height:60 }; }
});
const cache = new Map();
globalThis.document = {
  documentElement: el(),
  querySelector(s){ if(!cache.has(s)) cache.set(s, el()); return cache.get(s); },
  querySelectorAll(){ return []; },
  createElement(){ return el(); }
};
globalThis.document.documentElement.removeAttribute = function(){};
globalThis.addEventListener = () => {};
globalThis.window = { addEventListener(){}, removeEventListener(){} };
globalThis.matchMedia = () => ({ matches:false });
const def = (k,v) => Object.defineProperty(globalThis, k, { value:v, writable:true, configurable:true });
def("navigator", { storage:{ persist: async () => true } });
let csvCapturado = null;
def("Blob", class { constructor(p){ csvCapturado = p[0]; } });
def("URL", { createObjectURL:()=> "blob:x", revokeObjectURL(){} });
globalThis.setTimeout = setTimeout;
globalThis.clearTimeout = clearTimeout;
globalThis.indexedDB = undefined;          // fuerza el modo memoria del Store

vm.runInThisContext(src);
const run = (code) => vm.runInThisContext(code);

/* ---- utilidades de prueba ---- */
let ok = 0, fail = 0;
const t = (nombre, cond, extra="") => {
  if (cond) { ok++; console.log("  ok   " + nombre); }
  else { fail++; console.log("  FALLA " + nombre + (extra ? "  → " + extra : "")); }
};
const movs = async () => run('Store.all("movimientos")');
const esperar = (ms=0) => new Promise(r => setTimeout(r, ms));

await esperar(30);   // deja terminar el arranque asíncrono

console.log("\n1. Fecha local, no UTC (error #1)");
{
  const local = run("hoy()");
  const utc = new Date().toISOString().slice(0,10);
  t("hoy() da el día local a las 23:30", local === "2026-08-13", local);
  t("toISOString() habría dado otro día", utc === "2026-08-14", utc);
  t('ayer se muestra como "Ayer"', run('fechaCorta(sumaDias(hoy(),-1))') === "Ayer");
}

console.log("\n2. Cargo de la tarjeta (cierre 10, vence 7)");
{
  t("compra del 10 ago → vence 7 set",  run('calcFechaCargo("2026-08-10","tarjeta")') === "2026-09-07");
  t("compra del 11 ago → vence 7 oct",  run('calcFechaCargo("2026-08-11","tarjeta")') === "2026-10-07");
  t("compra del 11 dic → vence 7 feb",  run('calcFechaCargo("2026-12-11","tarjeta")') === "2027-02-07");
  t("cuenta de débito → cargo el mismo día", run('calcFechaCargo("2026-08-11","bbva")') === "2026-08-11");
}

console.log("\n3. Catálogo sembrado");
{
  t("6 cuentas", run("CUENTAS.length") === 6, run("CUENTAS.length"));
  t("Lemon existe y es en soles", run('cta("lemon").moneda') === "PEN");
  t("13 categorías", run("CATEGORIAS.length") === 13, run("CATEGORIAS.length"));
  t("existe Por cobrar", run('!!cta("cobrar")'));
  t("la tarjeta no tiene moneda fija", run('cta("tarjeta").moneda') === null);
  t("preset Ahorro oculto mientras no exista la cuenta",
    run('PRESETS.filter(p=>cta(p.desde)&&cta(p.hacia)).length') === 5);
}

console.log("\n4. Gasto simple en soles");
{
  run('Object.assign(S,{tipo:"egreso",moneda:"PEN",cuenta:"bbva",categoria_id:"comida",modo:"rutina",centimos:0}); push(1);push(2);push(5);push(0)');
  t("el teclado arma 12.50 sin punto ni coma", run("S.centimos") === 1250);
  await run("guardar()");
  const m = (await movs())[0];
  t("se guardó 1 movimiento", (await movs()).length === 1);
  t("céntimos enteros", Number.isInteger(m.monto_centimos) && Number.isInteger(m.monto_pen_centimos));
  t("monto_pen igual al monto en soles", m.monto_pen_centimos === 1250);
  t("tipo de cambio 1", m.tipo_cambio === 1);
  t("categoria_id, no texto", m.categoria_id === "comida" && m.categoria === undefined);
  t("modo rutina en Comida", m.modo === "rutina");
  t("fecha de consumo local", m.fecha_consumo === "2026-08-13");
  t("id uuid", /^[0-9a-f-]{36}$/.test(m.id));
}

console.log("\n5. Doble toque en Guardar (error #11)");
{
  run('Object.assign(S,{tipo:"egreso",moneda:"PEN",cuenta:"bbva",categoria_id:"transporte",centimos:500})');
  const p1 = run("guardar()"), p2 = run("guardar()");
  await p1; await p2;
  t("dos toques → un solo registro", (await movs()).length === 2, (await movs()).length);
  t("modo null fuera de Comida", (await movs()).find(m=>m.categoria_id==="transporte").modo === null);
}

console.log("\n6. Dólares sin tipo de cambio");
{
  run('Object.assign(S,{tipo:"egreso",moneda:"USD",cuenta:"efusd",categoria_id:"ocio",centimos:1000,destino:null,rate:null})');
  t("sin t.c. no deja guardar (evita monto_pen = 0)", run("puedeGuardar()") === false);
  run("S.rate = 3.75");
  t("con t.c. sí deja guardar", run("puedeGuardar()") === true);
  await run("guardar()");
  const m = (await movs()).find(x => x.categoria_id === "ocio");
  t("equivalente en soles congelado", m.monto_pen_centimos === 3750, m.monto_pen_centimos);
  t("guarda la moneda original", m.moneda === "USD" && m.monto_centimos === 1000);
}

console.log("\n7. Transferencia con cambio de moneda");
{
  run('Object.assign(S,{tipo:"transferencia",cuenta:"efusd",destino:"efpen",moneda:"USD",centimos:5000,centimosDestino:18750,categoria_id:null,fecha:hoy()})');
  t("detecta que hay conversión", run("hayConversion()") === true);
  await run("guardar()");
  const m = (await movs()).find(x => x.tipo === "transferencia");
  t("tipo transferencia", !!m);
  t("sin categoría", m.categoria_id === null);
  t("guarda los dos lados", m.monto_centimos === 5000 && m.monto_destino_centimos === 18750);
  t("t.c. derivado del par", Math.abs(m.tipo_cambio - 3.75) < 1e-6, m.tipo_cambio);
  t("monto_pen = el lado en soles", m.monto_pen_centimos === 18750);
  t("cuenta destino registrada", m.cuenta_destino_id === "efpen");
}

console.log("\n8. Validaciones de transferencia");
{
  run('Object.assign(S,{tipo:"transferencia",cuenta:"bbva",destino:null,moneda:"PEN",centimos:1000,centimosDestino:0})');
  t("sin destino no guarda", run("puedeGuardar()") === false);
  run('S.destino = "bbva"');
  t("origen y destino iguales no guarda", run("puedeGuardar()") === false);
  run('S.destino = "cobrar"');
  t("préstamo a Por cobrar sí guarda", run("puedeGuardar()") === true);
  run('S.destino = "efusd"; S.centimosDestino = 0');
  t("con cambio de moneda exige el segundo monto", run("puedeGuardar()") === false);
}

console.log("\n9. Editar reescribe, no duplica");
{
  const antes = await movs();
  const objetivo = antes.find(m => m.categoria_id === "transporte");
  run(`cargarParaEditar(${JSON.stringify(objetivo)})`);
  t("carga el movimiento en la captura", run("S.centimos") === 500 && run('S.categoria_id') === "transporte");
  run("S.centimos = 800");
  await run("guardar()");
  const despues = await movs();
  const m = despues.find(x => x.id === objetivo.id);
  t("no crea otro registro", despues.length === antes.length, despues.length + " vs " + antes.length);
  t("mismo id", !!m);
  t("monto corregido", m.monto_centimos === 800);
  t("creado_en intacto", m.creado_en === objetivo.creado_en);
  t("marca editado_en", !!m.editado_en);
  t("sale del modo edición", run("S.editando") === null);
}

console.log("\n10. Fecha futura y nota");
{
  run('S.fecha = hoy(); document.querySelector("#inFecha").onchange({target:{value:"2027-01-01"}})');
  t("no admite fechas futuras", run("S.fecha") === "2026-08-13", run("S.fecha"));
  run('document.querySelector("#inFecha").onchange({target:{value:"2026-08-01"}})');
  t("sí admite fechas pasadas", run("S.fecha") === "2026-08-01");
  run('document.querySelector("#notaInput").oninput({target:{value:"  taxi al hotel  "}})');
  t("nota recortada", run("S.nota") === "taxi al hotel");
}

console.log("\n11. Exportar CSV (error #14)");
{
  await run('document.querySelector("#btnExport").onclick()');
  t("lleva BOM UTF-8", csvCapturado.charCodeAt(0) === 0xFEFF);
  t("lleva encabezado de versión", csvCapturado.split("\n")[0].includes("gastos-v1"));
  const cab = csvCapturado.split("\n")[1];
  t("incluye id para deduplicar al importar", cab.startsWith("id,"));
  t("incluye los dos lados y el t.c.",
    ["monto_destino_centimos","tipo_cambio","monto_pen_centimos","fecha_cargo"].every(c => cab.includes(c)));
  t("una fila por movimiento", csvCapturado.trim().split("\n").length === 2 + (await movs()).length);
}

console.log("\n12. Invariantes sobre todo lo guardado");
{
  const all = await movs();
  t("ningún monto flotante", all.every(m => Number.isInteger(m.monto_centimos) && Number.isInteger(m.monto_pen_centimos)));
  t("ids únicos", new Set(all.map(m => m.id)).size === all.length);
  t("ninguna transferencia con categoría", all.filter(m => m.tipo === "transferencia").every(m => !m.categoria_id));
  t("todo movimiento tiene fecha de cargo", all.every(m => !!m.fecha_cargo));
}

console.log("\n13. Ciclo del 5 al 4");
{
  const c1 = run('cicloDe("2026-09-05")');
  t("el 5 arranca ciclo nuevo", c1.inicio === "2026-09-05" && c1.dia === 1, JSON.stringify(c1));
  t("termina el 4 del mes siguiente", c1.fin === "2026-10-04", c1.fin);
  const c2 = run('cicloDe("2026-09-04")');
  t("el 4 todavia es del ciclo anterior", c2.inicio === "2026-08-05" && c2.fin === "2026-09-04", JSON.stringify(c2));
  t("ultimo dia = total", c2.dia === c2.total, c2.dia + "/" + c2.total);
  const c3 = run('cicloDe("2026-01-03")');
  t("cruce de anio", c3.inicio === "2025-12-05" && c3.fin === "2026-01-04", JSON.stringify(c3));
  const c4 = run('cicloDe("2026-08-13")');
  t("hoy: dia 9 de 31", c4.dia === 9 && c4.total === 31, c4.dia + "/" + c4.total);
}

console.log("\n14. Importar CSV (respaldo que se restaura)");
{
  const csv = csvCapturado;                       // el que se exportó en el bloque 11
  const antes = (await movs()).length;
  const r1 = await run(`importarCSV(${JSON.stringify(csv)})`);
  t("reimportar el mismo archivo no duplica", (await movs()).length === antes, JSON.stringify(r1));
  t("los cuenta como repetidos", r1.repetidos === antes && r1.nuevos === 0, JSON.stringify(r1));

  // un movimiento ajeno, como si viniera de otro teléfono
  const ajeno = csv.trim().split("\n").slice(0,2).join("\n") +
    "\n11111111-2222-3333-4444-555555555555,2026-08-01,2026-08-01,egreso,ocio,,lemon,,PEN,4500,,,1,4500,cine,manual,2026-08-01T20:00:00.000Z,";
  const r2 = await run(`importarCSV(${JSON.stringify(ajeno)})`);
  t("un movimiento nuevo sí entra", r2.nuevos === 1, JSON.stringify(r2));
  const m = (await movs()).find(x => x.id.startsWith("11111111"));
  t("con sus números como enteros", Number.isInteger(m.monto_centimos) && m.monto_centimos === 4500);
  t("y su nota", m.nota === "cine");

  const basura = "gastos-v1\nid,fecha_consumo,tipo,monto_centimos,monto_pen_centimos\nabc,no-es-fecha,egreso,-5,x";
  const r3 = await run(`importarCSV(${JSON.stringify(basura)})`);
  t("descarta filas inválidas sin romperse", r3.invalidos === 1 && r3.nuevos === 0, JSON.stringify(r3));
  const corta = "gastos-v1\n" + csv.trim().split("\n")[1] + "\nsolo,dos,campos";
  const r4 = await run(`importarCSV(${JSON.stringify(corta)})`);
  t("una fila con columnas de menos se cuenta, no se ignora", r4.invalidos === 1, JSON.stringify(r4));

  const conComas = run('parseCSV(\'gastos-v1\\nid,nota\\nx1,"hola, mundo""raro"""\')');
  t("el parser respeta comas y comillas dentro del campo",
    conComas[0].nota === 'hola, mundo"raro"', JSON.stringify(conComas));
}

console.log("\n15. Resumen: saldos, disponible real y tarjeta");
{
  // escenario limpio
  await run('(async()=>{ for(const m of await Store.all("movimientos")) await Store.remove("movimientos", m.id); MOVS=[]; })()');
  run('cta("lemon").saldo_inicial_centimos = 100000');   // S/ 1000
  run('cta("bbva").saldo_inicial_centimos  = 20000');    // S/ 200

  const alta = async (cfg) => { run('Object.assign(S,' + JSON.stringify(cfg) + ')'); await run("guardar()"); };
  await alta({tipo:"egreso", moneda:"PEN", cuenta:"lemon", categoria_id:"comida", modo:"rutina", centimos:5000, fecha:"2026-08-13", destino:null});
  await alta({tipo:"egreso", moneda:"PEN", cuenta:"tarjeta", categoria_id:"ocio", centimos:8000, fecha:"2026-08-13", destino:null});
  await alta({tipo:"egreso", moneda:"PEN", cuenta:"tarjeta", categoria_id:"ocio", centimos:3000, fecha:"2026-08-08", destino:null});
  await alta({tipo:"transferencia", moneda:"PEN", cuenta:"lemon", destino:"bbva", centimos:10000, centimosDestino:0, fecha:"2026-08-13", categoria_id:null});
  await alta({tipo:"transferencia", moneda:"PEN", cuenta:"lemon", destino:"cobrar", centimos:5000, centimosDestino:0, fecha:"2026-08-13", categoria_id:null});

  t("saldo Lemon = inicial − gasto − transferencias", run('saldoCuenta("lemon")') === 80000, run('saldoCuenta("lemon")'));
  t("saldo BBVA sube con la transferencia", run('saldoCuenta("bbva")') === 30000, run('saldoCuenta("bbva")'));
  t("te deben lo prestado", run('saldoCuenta("cobrar")') === 5000, run('saldoCuenta("cobrar")'));

  const d = run('deudaTarjeta()');
  t("compra del 8 (antes del cierre) va a facturado", d.facturado === 3000, JSON.stringify(d));
  t("compra del 13 (después del cierre) va a en curso", d.enCurso === 8000, JSON.stringify(d));
  t("el próximo vencimiento es el 7 de setiembre", d.venc === "2026-09-07", d.venc);

  t("disponible real = líquido − SOLO lo facturado",
    run('disponibleReal()') === 80000 + 30000 - 3000, run('disponibleReal()'));

  const c = run('cicloDe(hoy())');
  t("las transferencias NO cuentan como gasto del ciclo",
    run(`totalCiclo("${c.inicio}","${c.fin}")`) === 5000 + 8000 + 3000,
    run(`totalCiclo("${c.inicio}","${c.fin}")`));

  // pagar la tarjeta baja lo facturado y no cuenta como gasto
  await alta({tipo:"transferencia", moneda:"PEN", cuenta:"lemon", destino:"tarjeta", centimos:3000, centimosDestino:0, fecha:"2026-08-13", categoria_id:null});
  const d2 = run('deudaTarjeta()');
  t("pagar la tarjeta deja el facturado en cero", d2.facturado === 0, JSON.stringify(d2));
  t("y el gasto del ciclo no cambió",
    run(`totalCiclo("${c.inicio}","${c.fin}")`) === 16000, run(`totalCiclo("${c.inicio}","${c.fin}")`));

  const porCat = run(`gastoPorCategoria("${c.inicio}","${c.fin}")`);
  t("categorías ordenadas de mayor a menor", porCat[0][0] === "ocio" && porCat[0][1] === 11000, JSON.stringify(porCat));
}

console.log("\n" + (fail ? "FALLARON " + fail + " de " + (ok+fail) : "TODO OK: " + ok + " comprobaciones"));
process.exit(fail ? 1 : 0);

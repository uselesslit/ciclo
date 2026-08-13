# CLAUDE.md

Contexto permanente del proyecto. Léelo completo antes de tocar código.

---

## Qué es esto

Un sistema de control de gastos personales. Una sola persona lo usa: el dueño del repo, recepcionista de hotel en Cusco y estudiante de Computación e Informática.

**No es un producto.** No hay usuarios que escalar, no hay multi-tenancy, no hay que impresionar a nadie. Si una decisión se justifica con "así se hace en producción" pero no mejora el uso diario de una persona, está mal.

**Reparto de roles:** el dueño cuestiona y valida las decisiones. Tú construyes. Él no va a escribir el código, así que no optimices para su aprendizaje; optimiza para que la herramienta funcione y se sostenga.

---

## Restricciones duras

| | |
|---|---|
| Presupuesto | **S/0**, hoy y sostenido. Sin suscripciones, sin free tiers que expiren, sin tarjeta |
| Dispositivo | Android, Moto G77. Chrome |
| Idioma | Todo en español: interfaz, commits, comentarios |
| Dependencias | **Cero.** Sin npm, sin build, sin CDN |

La regla de S/0 no es sobre licencias. Es sobre costo recurrente. Cualquier propuesta que dependa de un servicio que pueda cerrar su capa gratuita está descartada de entrada.

---

## Arquitectura

**PWA estática, offline-first, sin servidor.**

- HTML + CSS + JS vanilla
- IndexedDB local
- GitHub Pages (repo público — Pages gratuito no publica desde repos privados)
- Instalable a pantalla de inicio

Los datos nunca salen del teléfono. Sin analítica, sin telemetría, sin recursos externos.

### Por qué NO otras opciones

No las reabras sin un argumento nuevo:

| Descartado | Razón |
|---|---|
| Backend (Python, Node) | Necesita servidor. El servidor cuesta o expira |
| Render, Railway, Fly free tier | Se extinguen, duermen, disco efímero |
| React, Vue, cualquier framework | El build cuesta más que la app |
| localStorage | 5MB, síncrono, sin índices |
| Play Store | USD 25 de cuenta de desarrollador |
| Parser del PDF de BBVA | Frágil. Formatos de número ambiguos. Solo v3 y con archivo real |
| Sincronización entre dispositivos | Requiere servidor. Rediseño completo, no ajuste |

---

## Modelo de datos

```sql
cuentas(
  id, nombre, tipo,            -- debito | credito | efectivo | virtual
  moneda,                      -- PEN | USD | null (la tarjeta lleva ambas)
  saldo_inicial_centimos,
  limite_centimos,             -- solo credito
  dia_cierre, dia_vencimiento  -- solo credito
)

categorias(id, nombre, tipo, es_esencial)   -- tipo: ingreso | egreso

movimientos(
  id,                              -- crypto.randomUUID(); es la clave de deduplicación
  fecha_consumo, fecha_cargo,
  cuenta_id, cuenta_destino_id,    -- destino solo en transferencia
  categoria_id, modo,              -- modo: rutina | extra (solo Comida)
  monto_centimos,                  -- INTEGER, moneda original
  monto_destino_centimos,          -- solo si la transferencia cambia de moneda
  moneda, tipo_cambio,
  monto_pen_centimos,              -- congelado al registrar, NUNCA se recalcula
  tipo,                            -- ingreso | egreso | transferencia
  nota, origen, creado_en
)

ciclos(id, fecha_inicio, fecha_fin, saldo_declarado_centimos, parcial, cerrado_en)
```

### Invariantes — no las rompas

1. **Dinero como INTEGER en céntimos.** Nunca float. `0.1 + 0.2 !== 0.3`.
2. **`transferencia` nunca cuenta como gasto ni como ingreso.** Pagar la tarjeta, ahorrar, cambiar dólares y prestar son transferencias. Si alguna cuenta como egreso, los totales se duplican.
3. **`monto_pen_centimos` se congela al registrar.** Si se recalcula, el historial cambia solo cada vez que se mueve el tipo de cambio.
4. **Los saldos se muestran en su moneda.** Solo el consolidado convierte.
5. **Todas las fechas en hora local.** Ver "Errores" abajo.
6. **Append-only con reversas.** Corregir agrega, no reescribe.

---

## Situación real del usuario

Esto no es contexto de color: cada dato cambia una decisión de código.

- **Sueldo el día 5.** El ciclo va del 5 al 4, NO es mes calendario. Agrupar por mes partiría cada ciclo en dos.
- **Banco BBVA.** Exporta el estado de cuenta solo en PDF, no en Excel/CSV. Por eso no hay importación bancaria.
- **Tarjeta Visa BFree, línea S/500.** Cierre día 10, vencimiento día 7 del mes siguiente. Paga siempre el total: no hay cuotas, intereses ni pago mínimo que modelar.
- **La tarjeta factura deuda en soles Y en dólares por separado.** No la trates como cuenta de una sola moneda.
- **Casi no usa efectivo:** tarjeta y Plin. Eso hace posible cuadrar contra el saldo del banco.
- **Propinas en efectivo,** a veces en soles y a veces en dólares. Por eso existen dos cuentas de efectivo.
- **Come fuera casi siempre:** ~60 registros de comida al mes contra ~10 de todo lo demás. La pantalla de captura se diseña para este caso.
- **Turnos rotativos en recepción.** Registra de noche. De ahí el bug de zona horaria.
- **Le prestan plata seguido y casi siempre le devuelven.** Por eso existe la cuenta "Por cobrar".
- **Quiere empezar a ahorrar.** El ahorro es transferencia, no categoría.

### Cuentas

| Cuenta | Tipo | Moneda |
|---|---|---|
| BBVA | débito | PEN |
| Tarjeta | crédito | PEN + USD |
| Efectivo S/ | efectivo | PEN |
| Efectivo $ | efectivo | USD |
| Por cobrar | virtual | PEN |

**Por cobrar** no es real: es la plata prestada. Prestar es transferencia hacia ella, que devuelvan es transferencia de vuelta. Si un préstamo no vuelve, un toque lo convierte en egreso de Familia.

### Categorías

**Egreso esenciales:** Vivienda · Servicios · Educación · Transporte · Familia · Comida (rutina)
**Egreso discrecionales:** Suscripciones · Cuidado personal · Ocio · Otros · Comida (extra)
**Ingreso:** Sueldo · Propinas · Otros ingresos

Comida lleva toggle rutina/extra. **Otros** es un cajón deliberado: si algo cae ahí repetido, se promueve a categoría propia. No agregues categorías por anticipación.

---

## Errores que ya cometimos o casi cometimos

Cada uno costó una corrección. No los repitas.

1. **`toISOString()` para la fecha del día.** Devuelve UTC. Perú es UTC−5: después de las 7 pm el registro queda fechado al día siguiente. **Usa siempre fecha local construida a mano.** `creado_en` sí va en UTC, a propósito, porque es un instante.
2. **`hash_dedupe` con `Date.now()` adentro.** Siempre único, o sea inútil. Deduplicar por `id`.
3. **Exportar sin importar.** Un respaldo que no se restaura no es respaldo.
4. **Asumir que el almacenamiento persiste solo.** Es *best-effort*: el navegador puede desalojarlo. Hay que pedir `navigator.storage.persist()` dentro de un gesto del usuario, en el primer guardado, nunca al cargar la página. Mostrar el estado en Configuración.
5. **Contar el pago de la tarjeta como gasto.** Doble conteo. Es transferencia.
6. **Registrar préstamos como gasto de Familia.** Infla la categoría cada ciclo. Va a Por cobrar.
7. **Tratar la tarjeta como cuenta de una sola moneda.** Factura en soles y dólares por separado.
8. **Mezclar el consumo facturado con el que está en curso.** Vencen en meses distintos y salen de sueldos distintos. Se muestran separados.
9. **Categoría como texto libre.** "Comida", "comida" y "Alimentos" rompen todos los agregados.
10. **Semáforo verde/rojo de presupuesto.** El indicador de "encima/debajo" mide peor retención que el de progreso. Usa porcentaje de avance.
11. **Botón de guardar sin bloqueo.** Doble toque, registro duplicado.
12. **Incluir el primer ciclo parcial en la tendencia.** Arranca el promedio con un dato falso.
13. **No manejar `onversionchange`.** Con la app abierta en dos pestañas, la actualización queda colgada. Cerrar la conexión y pedir recarga.
14. **Exportar CSV sin BOM UTF-8.** Excel abre los acentos rotos.
15. **Poner controles frecuentes en la mitad superior.** Con el celular en una mano el pulgar no llega. Categorías abajo, sobre el teclado.
16. **Afirmar sin verificar.** Ya pasó con el formato de exportación de BBVA. Si no lo comprobaste, dilo.

---

## Reglas de interfaz

1. **Registrar toma menos de 5 segundos.** Si no, la función está mal hecha, no el usuario.
2. Teclado numérico tipo POS: los decimales se acomodan solos, sin punto ni coma.
3. Fichas de categoría ordenadas por frecuencia de uso, no alfabéticas.
4. Sin gamificación, rachas ni culpa. Son datos, no una nota de conducta.
5. Ninguna métrica que no pueda cambiar una decisión.
6. Corregir un movimiento cuesta lo mismo que crearlo.
7. Nada que solo sirva para verse bien en una captura de pantalla.
8. Los errores explican qué pasó y cómo arreglarlo. Nunca se disculpan ni son vagos.

### Jerarquía de la pantalla de inicio

```
Disponible real  =  saldo BBVA − deuda facturada de la tarjeta
   ↓
Ritmo del ciclo (día X de Y, S/ Z por día, quedan N)
   ↓
Categorías
   ↓
Tendencia de 3 ciclos
```

La tarjeta se muestra en dos bloques: **facturado** (vence el 7 próximo, sale de este sueldo) y **en curso** (vence el mes siguiente). Solo el facturado se resta del disponible. Lo prestado se muestra aparte, como "te deben".

---

## Alcance de v1 — congelado

**Entra:** captura completa (gasto, ingreso, transferencia, fecha, nota) · editar movimientos · 5 cuentas · 13 categorías · multi-moneda con tipo de cambio congelado · préstamos y devoluciones · fijos autogenerados por ciclo · cierre de ciclo con cuadre contra BBVA · inicio · historial filtrado por ciclo · exportar e importar CSV · persistencia solicitada · instalable con acceso directo

**No entra:** presupuestos por categoría · importación del PDF de BBVA · gasto compartido · intereses y pago mínimo · gráficos elaborados · adjuntar fotos · sincronización · múltiples usuarios · predicción por turno

Si el usuario pide algo de la segunda lista, no lo construyas todavía: dile que va después de usar la app un ciclo completo. El alcance existe para que el proyecto termine.

---

## Orden de construcción

| # | Entrega | Se valida con |
|---|---|---|
| 1 | Captura corregida | Fecha local, transferencias, editar, alcance del pulgar |
| 2 | Configuración inicial | Saldos, primer ciclo parcial, exportar **e importar** |
| 3 | Inicio | Disponible real, dos bloques de tarjeta, ritmo |
| 4 | Fijos y cierre de ciclo | Confirmar de un toque, cuadre contra BBVA |
| 5 | PWA + GitHub Pages | Instalar y que sobreviva a cerrar el celular |

La 2 va antes que el dashboard **a propósito**: hasta que la restauración funcione, cada prueba es desechable.

Solo la entrega 5 prueba lo que de verdad importa: que los datos persistan. Las entregas 1 a 4 prueban lógica, no persistencia. No des por seguro nada antes de instalarla.

Para probar en el celular: servidor local y abrir desde el teléfono en la misma wifi. Sin HTTPS no hay service worker ni Storage API, así que la prueba final va en GitHub Pages.

---

## Lo que esta arquitectura NO puede hacer

**No hay recordatorios.** Una PWA solo notifica si un servidor le empuja el aviso, y eso cuesta. La app nunca va a avisar "registra tu almuerzo". El hábito depende del usuario. Es el precio de los S/0 y hay que decirlo de frente, no esconderlo.

Mitigación sin costo: acceso directo de Android que abra en la pantalla de registro, y una alarma del propio celular.

**Si el usuario limpia los datos del navegador, pierde lo no exportado.** Por eso la importación es obligatoria en v1 y el aviso de respaldo a los 30 días también.

---

## Cómo trabajar con este usuario

- **Un paso a la vez, con confirmación explícita.** No adelantarse tres fases.
- **Respuestas breves y directas, con opciones claras** en vez de explicaciones largas.
- **Verifica antes de afirmar.** Si no lo comprobaste, dilo.
- **Reconoce los errores sin rodeos.** Ya hubo varios en este proyecto; el usuario los detecta y valora que se admitan.
- **No reescribas el diseño entero para parecer receptivo.** Cuando cuestione algo, distingue qué se cae y qué sigue en pie, y defiende lo segundo con argumentos.
- **Si algo parece mala idea, dilo aunque lo haya pedido él.**
- **Nada se construye sobre suposiciones sin confirmar.**

---

## Archivos del repo

- `CLAUDE.md` — este archivo
- `especificacion-v1.md` — la especificación completa, con más detalle
- `registrar.html` — prototipo de la pantalla de captura, ya con la fecha corregida. Base de la entrega 1, no versión final: le faltan fecha editable, nota, transferencias, editar y el reacomodo para el pulgar

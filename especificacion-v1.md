# Sistema de control de gastos — Especificación v1

Documento de decisiones cerradas. Nada se construye fuera de esto.

---

## 0. Restricciones

| | |
|---|---|
| Inversión | S/0 hoy y sostenido, sin tarjeta, sin free tier |
| Dispositivo | Android (Moto G77) |
| Uso | Personal, no portafolio |
| Roles | Tú cuestionas y validas · yo construyo |

---

## 1. Arquitectura

**PWA estática, offline-first, sin servidor.**

- HTML + CSS + JS vanilla, archivo único, sin build ni dependencias
- IndexedDB local
- GitHub Pages (HTTPS, requisito del service worker y del Storage API)
- Instalable a pantalla de inicio

Capas: captura → normalización → almacenamiento → análisis.

---

## 2. Modelo de datos

```sql
cuentas(
  id, nombre, tipo,            -- debito | credito | efectivo
  moneda,                      -- PEN | USD
  saldo_inicial_centimos,
  limite_centimos,             -- solo credito
  dia_cierre, dia_vencimiento  -- solo credito
)

categorias(
  id, nombre,
  tipo,                        -- ingreso | egreso
  es_esencial
)

movimientos(
  id,
  fecha_consumo, fecha_cargo,
  cuenta_id, cuenta_destino_id,   -- destino solo en transferencia
  categoria_id, modo,             -- modo: rutina | extra (solo Comida)
  monto_centimos,                 -- moneda original
  monto_destino_centimos,         -- solo si cambia de moneda
  moneda, tipo_cambio,
  monto_pen_centimos,             -- congelado, nunca se recalcula
  tipo,                           -- ingreso | egreso | transferencia | devolucion
  nota, origen, hash_dedupe, creado_en
)

ciclos(id, fecha_inicio, fecha_fin, saldo_declarado_centimos, cerrado_en)
```

### Reglas del modelo — no negociables

1. Dinero como **entero en céntimos**. Nunca decimal flotante.
2. `transferencia` nunca cuenta como gasto ni como ingreso.
3. Los montos en dólares guardan **el original y su equivalente en soles congelado**. El pasado no se reescribe.
4. Los **saldos** se muestran en su moneda. Solo el consolidado convierte.
5. Doble fecha por el desfase de la tarjeta.
6. Ciclo del **5 al 4**.

### Tabla `reglas` — ELIMINADA

Te prometí un motor que aprendiera los destinatarios frecuentes de Plin. Lo retiro: existía para auto-categorizar filas importadas por descripción, y la importación se descartó. Como ahora categorizas en el momento y las fichas se ordenan solas por frecuencia, ese aprendizaje ya ocurre en la interfaz. Mantenerlo sería complejidad sin trabajo que hacer.

---

## 3. Cuentas

| Cuenta | Tipo | Moneda |
|---|---|---|
| BBVA | débito | PEN |
| Tarjeta | crédito | PEN + USD |
| Efectivo S/ | efectivo | PEN |
| Efectivo $ | efectivo | USD |
| Por cobrar | virtual | PEN |

**Por cobrar** no es una cuenta real: es la plata que prestaste y te deben. Prestar es una transferencia hacia ella; que te devuelvan es una transferencia de vuelta. Así el préstamo nunca cuenta como gasto y su saldo te dice cuánto te deben.

Si un préstamo no vuelve, un toque lo convierte en egreso de Familia. Ahí sí fue un gasto.

**La tarjeta lleva dos saldos, no uno.** La Visa BFree factura deuda en soles y en dólares por separado. `cuentas.moneda` no puede ser un valor único para ella: el saldo se calcula por moneda a partir de los movimientos.

### Ciclo de la tarjeta

- **Cierre:** día 10
- **Vencimiento:** día 7 del mes siguiente

Una compra del 11 de agosto cierra el 10 de setiembre y se paga el 7 de octubre: casi dos meses de desfase. Eso es lo que la tarjeta oculta y la app tiene que hacer visible.

El vencimiento cae el 7 y tu sueldo entra el 5: el pago ocurre dos días después de cobrar, dentro del mismo ciclo de ingresos.

**Cargo de una compra:** si ocurre hasta el día 10, vence el 7 del mes siguiente; si ocurre del 11 en adelante, vence el 7 del subsiguiente.

---

## 4. Categorías

**Egreso — esenciales:** Vivienda · Servicios · Educación · Transporte · Familia · Comida (rutina)

**Egreso — discrecionales:** Suscripciones · Cuidado personal · Ocio · Otros · Comida (extra)

**Ingreso:** Sueldo · Propinas · Otros ingresos

Comida lleva toggle rutina/extra. Ahorro no es categoría: es transferencia.

**Otros** es un cajón deliberado. Si algo cae ahí repetidamente, se promueve a categoría propia. La taxonomía crece con evidencia.

---

## 5. Captura

- Teclado numérico tipo POS: los decimales se acomodan solos, sin punto ni coma
- Fichas de categoría ordenadas por frecuencia de uso
- Cuenta por defecto: la última usada
- **Fecha:** ficha que dice "Hoy"; un toque abre el selector. No admite fechas futuras
- **Nota:** campo opcional, colapsado. Cero toques en el caso normal
- **Repetir:** reproduce el último movimiento completo
- **Deshacer:** disponible 4 segundos tras guardar
- El botón se bloquea al primer toque — sin registros duplicados

### Transferencias

Tercer modo en el selector superior. Sin categoría; pide origen y destino.

Cinco presets:
- **Pago de tarjeta** → BBVA a Tarjeta
- **Ahorro** → BBVA a Ahorro
- **Cambio de moneda** → Efectivo $ a Efectivo S/, con monto distinto en cada lado
- **Presté** → BBVA o Efectivo a Por cobrar
- **Me devolvieron** → Por cobrar a BBVA o Efectivo

---

## 6. Pantallas

### Inicio
Jerarquía: disponible real → ritmo del ciclo → categorías → tendencia.

```
Disponible real
S/ 1,240.00
─ compromete tarjeta 463

Ciclo 5 ago → 4 set
████████░░░░  día 18/31
S/ 47/día · quedan 13

Comida        ███ 420
Transporte    ██  180
...

Tendencia 3 ciclos   ╱╲__╱

[＋ Registrar]
```

`Disponible real = saldo BBVA − deuda facturada de la tarjeta`

El consumo de la tarjeta se muestra en **dos bloques separados**, porque no salen del mismo sueldo:

- **Facturado** — cerró el 10, vence el 7 próximo. Sale de este sueldo. Es compromiso firme.
- **En curso** — lo que llevas gastado desde el último cierre. Vence un mes después. Todavía no toca este sueldo.

Mezclarlos te haría creer que debes más de lo que te toca pagar ahora, o menos de lo que ya comprometiste. Solo el facturado se resta del disponible.

Lo que prestaste tampoco aparece acá: salió de tu cuenta y todavía no vuelve. Su saldo se muestra aparte, como "te deben".

### Fijos del ciclo
Los cuatro se generan solos al inicio del ciclo con el monto del mes anterior. Confirmas de un toque o corriges el monto.

### Cierre de ciclo
Ingresas el saldo real de BBVA. La app calcula la diferencia contra lo registrado. Si es chica, cierra. Si es grande, sabes que estás dejando de registrar. El efectivo se ajusta aparte, por cuenta.

### Configuración
Exportar CSV · estado de persistencia · saldos iniciales · fechas de la tarjeta.

---

## 7. Reglas de interfaz

1. Registrar toma menos de 5 segundos o la función está mal hecha.
2. **Porcentaje de avance, nunca semáforo verde/rojo.** El indicador de "encima/debajo" mide peor retención que el de progreso.
3. Sin gamificación, rachas ni culpa. Son datos, no una nota de conducta.
4. Ninguna métrica que no pueda cambiar una decisión.
5. Máximo 12 categorías visibles.
6. Corregir un movimiento cuesta lo mismo que crearlo.

---

## 8. Riesgos técnicos — resueltos

### Persistencia del almacenamiento
El almacenamiento del navegador es *best-effort* por defecto: bajo presión de espacio puede desalojarse sin avisar. Hay que pedir persistencia explícitamente, y se concede según la interacción y si la app está instalada.

**Decisión:** `navigator.storage.persist()` en el primer guardado, dentro del gesto del usuario, nunca al cargar la página. El estado se muestra en Configuración. Si se niega, lo sabes.

### Migraciones de esquema
IndexedDB no borra datos por sí solo en una actualización; el riesgo es de código. Migraciones acumulativas revisando `oldVersion` dentro de `onupgradeneeded`, cada una idempotente.

### Múltiples pestañas
Escuchar `onversionchange`, cerrar la conexión de inmediato y pedir recarga. Sin esto la actualización queda colgada.

### Service worker
Cache-first sobre el archivo único. Nunca toca IndexedDB. La versión nueva no se activa sola: avisa y tú recargas.

### Doble toque, base vacía, recuperación
- Botón bloqueado durante el guardado
- Primera apertura: configuración de saldos iniciales y fechas de tarjeta
- Si el almacenamiento falla, cae a memoria **y lo dice**

### Zona horaria — bug encontrado en el código ya escrito
`toISOString()` devuelve fecha UTC. Perú es UTC−5: entre las 7 pm y medianoche un movimiento quedaba fechado al día siguiente. Con turnos de noche, eso es la mitad de los registros. **Todas las fechas se calculan en hora local.**

### Restaurar desde CSV
Exportar sin poder importar no es respaldo. La importación lee el CSV propio, deduplica por `id` y no pisa lo existente. El CSV lleva encabezado de versión para que un respaldo viejo siga sirviendo.

El archivo se escribe con BOM UTF-8, o Excel abre los acentos rotos.

### `hash_dedupe` — corregido
Lo escribí incluyendo `Date.now()`, lo que lo hacía siempre único y por lo tanto inútil. La deduplicación real se hace por `id`.

### Editar movimientos
Abrir un movimiento del historial lo carga en la pantalla de captura para corregirlo. Hoy solo se puede borrar.

### Primer ciclo incompleto
Al instalar a mitad de ciclo, los saldos iniciales son de hoy, no del día 5. El primer ciclo se marca como parcial y se excluye de la tendencia: si no, arranca con un promedio falso.

### Alcance del pulgar
Las fichas de categoría van debajo del monto y sobre el teclado. Con el celular en una mano, todo lo que se toca seguido queda en la mitad inferior.

### Reincorporación
Si pasan días sin registros, el inicio ofrece dos salidas: registrar lo pendiente, o ajustar contra el saldo real y seguir. Sin lenguaje de culpa. Este es el mecanismo que decide si el sistema dura 3 semanas o 2 años.

---

## 9. Respaldo

- Exportación CSV manual desde el día uno
- Aviso si pasan 30 días sin respaldar
- El CSV es legible sin la app: tuyo aunque el proyecto muera

- Importación del mismo CSV para restaurar

**El riesgo que queda:** si limpias los datos del navegador a propósito, pierdes lo que no hayas exportado. Es el costo real de no tener servidor.

---

## 9-bis. Lo que esta arquitectura NO puede hacer

**No hay recordatorios.** Una PWA solo puede enviar notificaciones si existe un servidor que las empuje, y eso cuesta plata. La app nunca te va a avisar "registra tu almuerzo". El hábito depende de ti, no de ella. Este es el precio real de los S/0 y hay que aceptarlo de frente.

Mitigación posible sin costo: un acceso directo de Android que abra la app en la pantalla de registro, y una alarma del propio celular a una hora fija.

**El repositorio será público.** GitHub Pages gratuito solo publica desde repos públicos. El código queda a la vista; **tus datos no**, porque nunca salen del teléfono. Vale saberlo antes, no después.

---

## 10. Alcance de v1 — congelado

**Entra:** captura completa (gasto, ingreso, transferencia, fecha, nota) · editar movimientos · 5 cuentas incluida Por cobrar · 13 categorías · multi-moneda con tipo de cambio congelado · préstamos y devoluciones · fijos autogenerados · cierre de ciclo con cuadre · inicio con disponible real en dos bloques, ritmo, categorías y tendencia · historial filtrado por ciclo · exportar **e importar** CSV · persistencia · instalable con acceso directo

**No entra:** presupuestos por categoría · importación del PDF de BBVA · gráficos elaborados · adjuntar fotos · sincronización · múltiples usuarios · predicción de gasto por turno

v1 termina cuando todo lo de "entra" funciona. Lo demás se discute después de usarlo un ciclo completo, no antes.

---

## 11. Resuelto

1. **Fechas de la tarjeta** — cierre día 10, vencimiento día 7. Ya están en el modelo.
2. **Gasto compartido** — poco frecuente. Fuera de v1; va con nota en Otros ingresos.
3. **Familia es esencial.** Y los préstamos se modelan con Por cobrar, no como gasto.

**Límite conocido:** el modelo asume que pagas el total facturado. No calcula intereses ni arrastre de pago mínimo. Si algún ciclo pagas menos del total, el saldo de la tarjeta quedará desfasado y hay que ajustarlo a mano.

Nada bloquea el inicio.

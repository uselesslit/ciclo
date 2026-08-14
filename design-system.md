---
version: alpha
name: Jade
description: Sistema de diseño de la app de gastos. Paleta derivada por método (armonía split-complementaria, 60-30-10, roles Material You), no copiada del escritorio.
colors:
  bg: "#192621"
  surface-1: "#22332D"
  surface-2: "#2C4139"
  surface-3: "#384F46"
  xa1: "#00271A"
  xa2: "#003D2C"
  xa3: "#00553F"
  xa4: "#046E53"
  xa5: "#038968"
  xa6: "#48A686"
  xa7: "#72C0A3"
  xa8: "#99DBC1"
  xa9: "#BCF3DC"
  on-primary: "#00271A"
  ingreso: "#47A2AB"
  ingreso-texto: "#71BCC5"
  egreso: "#C47C76"
  egreso-texto: "#DD9A94"
  texto-87: "#E2E4E4"
  texto-60: "#A7ADAB"
  texto-38: "#76817D"
typography:
  cifra-xl:
    fontFamily: "JetBrains Mono"
    fontSize: 46px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.04em
    fontFeature: "tnum"
  cifra-md:
    fontFamily: "JetBrains Mono"
    fontSize: 25px
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  cifra-sm:
    fontFamily: "JetBrains Mono"
    fontSize: 13px
    fontWeight: 500
    fontFeature: "tnum"
  cuerpo:
    fontFamily: "Adwaita Sans"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  boton:
    fontFamily: "Adwaita Sans"
    fontSize: 15px
    fontWeight: 700
    letterSpacing: 0.02em
  rotulo:
    fontFamily: "Adwaita Sans"
    fontSize: 9.5px
    fontWeight: 700
    letterSpacing: 0.2em
rounded:
  sm: 14px
  md: 18px
  lg: 22px
  xl: 26px
  full: 999px
spacing:
  1: 4px
  2: 7px
  3: 10px
  4: 14px
  5: 18px
  6: 26px
components:
  boton-primario:
    backgroundColor: "{colors.xa6}"
    textColor: "{colors.on-primary}"
    typography: "{typography.boton}"
    rounded: "{rounded.lg}"
    padding: 17px
  boton-secundario:
    backgroundColor: "transparent"
    textColor: "{colors.xa7}"
    typography: "{typography.cuerpo}"
    rounded: "{rounded.md}"
    padding: 13px
  pieza-editable:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.texto-87}"
    rounded: "{rounded.sm}"
    padding: 7px
  panel:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.xl}"
    padding: 17px
  opcion-dial:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.texto-87}"
    rounded: "{rounded.full}"
    size: 70px
  opcion-dial-activa:
    backgroundColor: "{colors.xa6}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 88px
---

# Jade

## Overview

Una sola persona usa esta app, de pie, con una mano, muchas veces al día: recepcionista de hotel en Cusco, turnos rotativos. La pantalla tiene un solo trabajo — registrar un gasto en menos de cinco segundos — y todo lo demás está subordinado a eso.

El tono es sobrio y sin juicio. No felicita, no regaña, no gamifica. Muestra números y se aparta.

**La paleta no viene del escritorio del usuario.** Su escritorio es Berserk Eclipse (rojo sangre / negro / dorado) y pidió explícitamente que la app no lo copie. Todo lo de abajo se derivó con el método de `reference-color-theory-theming`: armonía declarada, 60-30-10, familias de nueve tonos, roles Material You y contraste calculado.

## Colors

**Armonía: split-complementaria.** Matiz base 168° (verde azulado). Los dos complementarios divididos cargan el significado del dinero: **205°** para lo que entra, **25°** para lo que sale. Al salir del mismo eje, nunca compiten entre sí.

### 60-30-10

| % | Rol | Token | Dónde |
|---|-----|-------|-------|
| 60 | Fondo | `bg` `#192621` | Canvas, áreas vacías |
| 30 | Superficie | `surface-1` → `surface-3` | Tarjetas, hoja del teclado, barra |
| 10 | Acento | `xa6` `#48A686` | Confirmar, ficha activa, progreso |

### La familia primaria

`xa1 #00271A` · `xa2 #003D2C` · `xa3 #00553F` · `xa4 #046E53` · `xa5 #038968` · `xa6 #48A686` · `xa7 #72C0A3` · `xa8 #99DBC1` · `xa9 #BCF3DC`

Solo `xa5`–`xa7` son interactivos. `xa8` y `xa9` nunca en áreas grandes: queman.

### Contrastes verificados

| Par | Ratio | Veredicto |
|---|---|---|
| `xa6` sobre `bg` | 5.28:1 | AA |
| `xa7` sobre `surface-1` | 6.19:1 | AA texto normal |
| `xa1` sobre relleno `xa6` | 5.42:1 | AA — texto del botón |
| ingreso `#71BCC5` sobre `surface-1` | 6.14:1 | AA |
| egreso `#DD9A94` sobre `surface-1` | 5.78:1 | AA |
| texto 87 % `#E2E4E4` | 10.42:1 | AAA |
| texto 60 % `#A7ADAB` | 5.83:1 | AA |
| texto 38 % `#76817D` | 3.30:1 | solo apagado y pistas |

**Corrección aplicada:** `xa5` sobre superficie da 3.03:1, justo en el límite. Los bordes que comunican estado usan `xa6`; `xa5` queda para separadores decorativos.

### Semántica

- **Ingreso** `#71BCC5` — sueldo, propinas, devoluciones.
- **Egreso fuerte** `#DD9A94` — deuda facturada de la tarjeta, alertas. No se usa para cada gasto: si todo lo que sale fuera rojo, la pantalla entera sería una alarma.
- **Transferencia** — sin color propio: es neutra por definición y nunca cuenta como gasto ni como ingreso.

## Typography

**JetBrains Mono** para todo lo que sea plata. Ancho fijo, `tnum` siempre activo: las columnas cuadran y la coma se lee sin contar dígitos. **Adwaita Sans** para el texto de interfaz.

Ambas viven en `fuentes/` como woff2 recortados a los caracteres que la app usa: 66 KB en total, sin CDN y sin build.

| Nivel | Uso |
|---|---|
| `cifra-xl` 46px/800 | El monto que se está escribiendo |
| `cifra-md` 25px/800 | Cifras del mosaico |
| `cifra-sm` 13px/500 | Montos en listas |
| `cuerpo` 15px/400 | Todo el texto |
| `boton` 15px/700 | Acciones |
| `rotulo` 9.5px/700, tracking .2em | Encabezados de sección, en mayúsculas |

Nunca blanco puro en texto: 87 % / 60 % / 38 %.

## Layout

**Celular:** una columna. Zona superior para leer, dos tercios inferiores para actuar — ahí llega el pulgar. El teclado y las acciones nunca suben de la mitad.

**Computadora:** mosaico modular de cuatro columnas; el tamaño de cada tarjeta comunica su importancia. Sin teclado en pantalla: el monto se escribe con `Ctrl + K` en una sola línea, y los modos tienen atajo `G` / `I` / `T`.

Espaciado en escala de 4 → 26. Los grupos se separan con `gap`, nunca con márgenes sueltos.

## Elevation & Depth

La elevación se hace **con brillo, no con sombras**: `bg` → `surface-1` → `surface-2` → `surface-3`. Cada escalón sube la luminosidad, como manda la guía para tema oscuro.

Encima de eso, una sola idea de profundidad: **lo activo flota, lo demás se hunde y se difumina**. Cuando el dial está abierto, el teclado queda detrás con `blur(3px)` y opacidad 0.3. Un filo de luz de 1 px (`inset 0 1px 0 rgba(255,255,255,.13)`) en el borde superior de cada panel hace de reflejo.

**Presupuesto de desenfoque: dos capas.** `backdrop-filter` se recalcula en cada scroll y cada toque; en el Moto G77 más de dos capas encimadas se nota. El blur vive en los paneles, nunca en las fichas ni en las teclas.

## Shapes

Radios 14 → 26, y **la forma cambia con el estado**, no solo el color: el botón principal pasa de radio 22 en reposo, se ensancha y hunde al apretarlo, y colapsa a círculo con un check al guardar. Las opciones del dial son círculos completos; las tarjetas, rectángulos suaves. Ese contraste de formas es deliberado.

El movimiento va con física de muelle, no con duraciones fijas. Y todo se apaga bajo `prefers-reduced-motion`.

## Components

Ver el bloque `components` del front matter para los tokens exactos. Reglas que no están en los tokens:

- **Botón primario:** un solo primario por pantalla. Deshabilitado = opacidad 0.4, nunca gris plano.
- **Ficha activa:** relleno `xa6` con texto `xa1`. El color no es la única señal: también cambia de peso tipográfico.
- **Pieza editable:** borde punteado. Comunica "esto se puede tocar" sin parecer un botón.
- **Medidor de ciclo:** degradado `xa5` → `xa7`. Muestra avance, nunca "vas bien / vas mal".

## Do's and Don'ts

**Sí**
- Calcular el contraste antes de aprobar un color, y anotar el ratio.
- Elevar con brillo.
- `tnum` en toda cifra.
- Un solo acento por pantalla.

**No**
- Blanco puro (`#FFF`) o negro puro en texto o fondo. Mínimo `#121212` de fondo.
- `xa8`/`xa9` en áreas grandes.
- Rojo para cada gasto: el egreso fuerte es para deuda y alertas.
- Semáforos de "encima/debajo del presupuesto": el indicador es de avance.
- Más de dos capas de `backdrop-filter`.
- Color como única señal de estado.

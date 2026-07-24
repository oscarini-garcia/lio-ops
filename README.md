# 🐩 Las Mañanas de Lio

App familiar que responde una pregunta cada mañana: **¿a quién le toca sacar a
Lio?** (Lio es un caniche toy negro con opiniones firmes sobre los horarios.)

Mariona y Amaya se reparten los días de diario, Ana y Oscar los findes — y el
patrón se edita en la propia app. Cualquier cambio sobre el plan (cubrir,
intercambiar, rangos de viaje o el retroactivo «ese día lo saqué yo») necesita
la aprobación de la persona afectada. Si una mañana nadie sale, también se
registra: Lio perdona, pero apunta.

## Cómo funciona

- **PWA** (Vite + React + Tailwind) desplegada en GitHub Pages — mismo enfoque
  que Counter Ops.
- **Sin cuentas**: cada miembro tiene un enlace personal (`?member=oscar`) que
  añade a su pantalla de inicio; ese enlace es su identidad.
- **Local-first**: los datos viven en el móvil y se sincronizan en segundo
  plano con un documento compartido en JSONBin; el merge por entidad hace que
  varios móviles converjan sin pisarse.
- **Peticiones con aprobación**: pending → aceptada / rechazada / cancelada /
  caducada. Aceptar aplica los cambios de calendario en la misma escritura.
- **Datos divertidos**: racha de Lio, mañanas en casa, madrugador/a del mes,
  favorito/a de Lio y la deuda matutina (quién debe mañanas a quién).
- **Avisos**: globo en el icono (iOS 16.4+) para peticiones pendientes; push
  con OneSignal en la v2.
- **App iOS nativa (opcional)**: la misma web empaquetada con Capacitor y con
  actualizaciones Over-The-Air (los cambios de web llegan solos, sin pasar por
  Apple). Ver [docs/iOS.md](docs/iOS.md).

## Arrancar

Ver [INSTALL.md](INSTALL.md). Resumen: crear un bin en JSONBin, poner
`VITE_JSONBIN_ID` y `VITE_JSONBIN_KEY` como variables de Actions, activar
GitHub Pages (source: GitHub Actions) y hacer merge a `main`.

```sh
cd app && npm install && npm run dev   # desarrollo
npm test                               # tests (vitest)
```

## Estructura

```
app/src/lib/        horario, peticiones, stats, merge, sync (lógica pura)
app/src/hooks/      store (reducer), identidad por enlace, ciclo de sync
app/src/screens/    Hilo (cronología) · Bandeja · Datos · Familia
app/src/components/ mascota, avatares, hoja de acciones por día, shell
mockups/            maquetas HTML aprobadas (fase de diseño)
```

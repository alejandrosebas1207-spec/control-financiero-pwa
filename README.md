# 💰 Mi Control Financiero (PWA para iPhone y Web)

Panel financiero personal interactivo optimizado como Progressive Web App (PWA) para iOS / iPhone y cualquier navegador web.

---

## 📱 Cómo instalar en tu iPhone:

1. Abre la URL de tu app en **Safari** (por ejemplo `https://tu-panel.onrender.com`).
2. Toca el botón **Compartir** (el icono de un cuadrado con una flecha hacia arriba en la parte inferior de Safari).
3. Desliza hacia abajo y selecciona **"Añadir a pantalla de inicio"** (*Add to Home Screen*).
4. Elige el nombre (por ejemplo **"Finanzas"**) y toca **Añadir**.
5. ¡Listo! La app aparecerá en la pantalla de inicio con su icono y se abrirá a pantalla completa sin barras del navegador.

---

## 🚀 Despliegue en Render (Paso a Paso):

### Paso 1: Subir este proyecto a tu GitHub
Abre una terminal en esta carpeta y ejecuta:
```bash
git init
git add .
git commit -m "Mi Control Financiero PWA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Crear el Static Site en Render
1. Inicia sesión en [render.com](https://render.com).
2. Haz clic en **"New +"** en la esquina superior derecha y selecciona **"Static Site"**.
3. Conecta tu repositorio de GitHub recién creado.
4. Configura los campos:
   - **Name:** `mi-control-financiero` (o el nombre que prefieras).
   - **Branch:** `main`
   - **Build Command:** *(dejar completamente vacío)*
   - **Publish Directory:** `./`
5. Haz clic en **"Create Static Site"**.
6. En menos de 1 minuto, Render te entregará una URL segura (`https://mi-control-financiero.onrender.com`) lista para abrir en tu iPhone.

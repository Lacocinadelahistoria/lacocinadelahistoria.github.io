# Activación del panel

El editor público está en `/admin/`. Mientras `admin/config.json` tenga `apiBase` vacío, funciona en modo consulta: no simula un inicio de sesión ni guarda cambios.

El servicio está preparado para Cloudflare Workers. Guarda únicamente `data/contenido.json` en la rama `main` del repositorio existente. No acepta rutas ni repositorios enviados por el navegador. Cada guardado identifica el usuario en el mensaje del commit. Usa la versión SHA del archivo para evitar sobrescribir cambios concurrentes.

## Configuración pendiente

1. Desplegar este Worker en una cuenta de Cloudflare. Revisar `wrangler.jsonc` y habilitar el binding de límite de intentos.
2. Crear un token de GitHub restringido a este repositorio, con permiso Contents: Read and write. Guardarlo como secreto `GITHUB_TOKEN` del Worker. No ponerlo en la web ni en el repositorio. El token debe pertenecer a una cuenta con permisos de escritura y debe poder generar publicaciones de GitHub Pages.
3. Generar un secreto aleatorio de al menos 32 caracteres y guardarlo como `SESSION_SECRET`.
4. Crear el secreto `USERS_JSON` con los usuarios `rlopez` y `msuriano`. Cada entrada tiene `{ "salt": "base64 de 16 bytes aleatorios", "hash": "base64 de PBKDF2 SHA-256 con 100000 iteraciones y salida de 32 bytes" }`. La función `passwordHash` del Worker define el formato. Las contraseñas se introducen solo en un entorno de aprovisionamiento privado; nunca se incluyen en archivos públicos ni en parámetros de comandos. No hay claves predeterminadas en el código.
5. Poner la URL HTTPS real del Worker en `admin/config.json`, por ejemplo `{ "apiBase": "https://DOMINIO-REAL-DEL-SERVICIO" }`.
6. Comprobar ingreso con cada usuario, guardar una edición reversible, verificar el commit y la actualización de Pages, comprobar rechazo de contraseña incorrecta y cerrar sesión. No considerar el acceso operativo antes de estas pruebas.

Las sesiones duran una hora y se conservan solo en memoria del navegador. Recargar exige ingresar nuevamente. Rotar `SESSION_SECRET` revoca todas las sesiones. Quitar un usuario de `USERS_JSON` revoca su acceso; agregar otro con salt y hash propios permite sumar administradores.

El binding de rate limit limita los intentos por IP y los guardados por usuario. El servicio rechaza otros orígenes y no devuelve el token de GitHub. Los hashes y secretos se guardan en Cloudflare, nunca en GitHub Pages. Mantener los registros sin cuerpos de login ni encabezados de autorización.

## Límites editoriales

- Los textos se escriben en el panel como párrafos. Se muestran como texto seguro, sin ejecutar HTML.
- Los archivos pesados permanecen en Drive. El panel guarda sus enlaces. No sube archivos automáticamente a Drive ni accede a la cuenta educativa.
- Una imagen compartida puede verse mediante la miniatura de Drive. No todos los permisos o archivos de Drive permiten incrustación; siempre verificar sin sesión de Google. Un enlace HTTPS directo de imagen también sirve.
- Los PDF y archivos de Drive se muestran en un visor con enlace alternativo. El texto de un documento de Drive no se importa automáticamente.
- Los mapas se editan en Google My Maps y se incorporan pegando su enlace completo. No se aceptan códigos HTML arbitrarios ni enlaces cortos.
- Los elementos con “Mostrar en la web” desactivado no se listan en las secciones, pero el JSON y el historial de Git son públicos. No son borradores privados.
- La primera versión permite agregar, editar, ocultar y eliminar publicaciones y mapas; también permite editar y eliminar elementos de cronología y patrimonio, y editar portada, participación y presentación del proyecto. La eliminación requiere confirmación y luego guardar. No borra el archivo original en Drive o My Maps ni el historial de versiones de GitHub.

Referencias: [API de contenidos de GitHub](https://docs.github.com/en/rest/repos/contents), [Rate Limiting de Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Recorridos históricos

La colección Recorridos admite varios mapas de My Maps, presentación, localidades, duración, distancia y paradas en orden. Las rutas se trazan en My Maps. Publicar, ocultar o eliminar la ficha no modifica el mapa original de Google. No hay recorridos históricos inventados: la colección comienza vacía.

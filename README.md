# NheuDocs

Herramientas PDF que procesan archivos en el navegador. Las tarjetas abren la herramienta elegida en su propia página, dentro de la misma pestaña.

## Inicio

Ejecuta `.\Iniciar.ps1` o `npm start` y abre http://127.0.0.1:4173/. Se necesita Python para la vista previa local.

Las bibliotecas se incluyen en `vendor/`. Para reconstruirlas usa `npm ci` y `npm run setup`. Para publicar en cualquier alojamiento estático, ejecuta `npm run export` y publica `dist/`.

## Herramientas

| Herramientas | Implementación |
|---|---|
| Unir, dividir, eliminar, extraer, ordenar | En navegador. Orden de archivos con botones; selección de páginas con rangos, para extraer o eliminar. Orden visual con miniaturas al ordenar. División a ZIP. |
| Rotar, numerar, marca de agua | En navegador. Páginas seleccionables y opciones específicas. Texto latino con fuente PDF estándar. |
| Comprimir | Optimización estructural sin rasterizar; si aumenta el tamaño se devuelve el original. Dos modos visuales convierten páginas a JPEG, eliminando texto seleccionable y elementos interactivos. |
| PDF a Word | DOCX real y editable con texto extraíble. No reconstruye imágenes, tablas ni diseño complejo. Requiere texto seleccionable. |
| PDF a PowerPoint | PPTX real con una imagen por diapositiva; contenido visual no editable. Páginas de distinta proporción se encajan sin deformar. |
| PDF a Excel | XLSX con una hoja por página, filas y columnas aproximadas según posición del texto. No interpreta fórmulas. |
| PDF a JPG | ZIP con una imagen JPEG por página. No extrae por separado las imágenes internas del PDF. |
| JPG a PDF, escanear | JPG, PNG y WebP a A4. El selector de móvil puede abrir la cámara. No hay QR entre dispositivos ni corrección de perspectiva. |
| HTML a PDF | Convierte texto de HTML local. No carga URLs ni conserva CSS/imágenes. No ejecuta scripts. |
| Editar | Añade texto a coordenadas porcentuales; no modifica texto original ni ofrece un editor gráfico completo. |
| Firmar | Firma dibujada en canvas, incrustada como imagen. No es firma digital certificada ni permite solicitar firmas. |
| Censurar | Rasteriza todas las páginas y borra de la imagen la zona elegida; reconstruye un PDF sin texto, formularios ni metadatos originales. Revisa visualmente antes de compartir. |
| Recortar | Cambia CropBox: oculta márgenes sin eliminar su contenido. No usar para censurar. |
| Formularios | Rellena texto, casillas, listas y opciones existentes; permite añadir un campo de texto. No detecta campos en escaneos. |
| Comparar | Informe HTML de diferencias de texto por página, con el texto de ambas versiones. No compara imágenes o diseño. |
| PDF a Markdown | Texto por páginas con separación Markdown. No reconstruye tablas ni jerarquía de títulos. |

El catálogo incluye un flujo para unir, girar y numerar PDF. No hay límite fijo de peso; se admiten hasta 50 archivos por operación.

## Verificación

Ejecuta `npm run check` y `npm test`. Para probar las conversiones en el navegador, ejecuta `node tests/fixtures.mjs` y abre http://127.0.0.1:4173/tests/browser.html.

## Suite Docs · IMG · ZipFusion

El selector de productos de la cabecera abre `?mode=docs`, `?mode=img` y
`?mode=zip`. Los enlaces directos `?tool=…` seleccionan automáticamente el
producto. Se mantienen las tarjetas, filtros, búsqueda y tema claro/oscuro.
El selector, las tarjetas y el regreso al catálogo cambian de vista sin recargar
el documento. La URL se actualiza con History API y admite Atrás/Adelante.
Mientras se procesa un archivo se espera a que termine antes de cambiar de vista.
Nheu IMG usa amarillo corporativo `#f2c230`; los logotipos vectoriales están
 en `assets/logo.svg`, `assets/logo-img.svg` y `assets/logo-zip.svg`.

IMG incluye compresión por lotes, redimensionado proporcional, recorte con
selección visual, conversión JPG/PNG/WebP/GIF, ajustes de luz y color, texto,
ampliación interpolada, eliminación de fondo uniforme, marcas de agua de texto
o logo, memes, rotación/espejo, HTML local a imagen, pixelado manual, edición
EXIF JPEG, limpieza de metadatos y GIF animado. Las vistas previas muestran la
primera imagen del lote; el resultado final puede descargarse como ZIP.

Límites: 50 archivos de entrada; 24 megapíxeles por imagen; hasta 16.000
píxeles por lado. Los GIF de entrada se tratan como imágenes fijas. HEIC, RAW,
PSD y TIFF no están soportados. Ampliación, eliminación de fondo y pixelado no
utilizan IA ni detección de rostros. HTML admite contenido local saneado y
estilos básicos, sin scripts, recursos remotos ni captura por URL. Los campos
EXIF admiten texto latino y su edición es exclusiva de JPEG. La limpieza JPEG
conserva los píxeles y el perfil ICC; el resto se reexporta a PNG.

ZipFusion integra la lógica de offsets ZIP del proyecto hermano `../zipfusion`,
con fusión JPG/PNG + archivos, extracción a ZIP estándar, creación de ZIP y
contraseña AES-256 opcional. Conserva un ZIP existente sin recomprimir cuando
no se solicita contraseña nueva. Los archivos extraídos se entregan en un ZIP
sin contraseña. ZipFusion no impone un límite de tamaño de entrada o extracción:
la capacidad real depende de la memoria disponible y del navegador. No se puede
calcular un máximo fiable desde la web; un archivo grande puede agotar la memoria.
Se mantiene el límite de 1.000 entradas por ZIP. Docs e IMG tampoco imponen un
límite de peso. Se conservan los límites de cantidad de archivos y píxeles para
evitar operaciones excesivas; no garantizan que cualquier archivo pueda procesarse.
No recomprimir
una imagen fusionada, porque podría perder su ZIP adjunto.

Las bibliotecas se sirven desde `vendor/`; no se suben archivos a un servidor.
La biblioteca `zip-full.min.js` se ha conservado del proyecto ZipFusion.
`npm run setup` prepara las demás bibliotecas y sus licencias.

Validación: `npm test`, `npm run check` y `/tests/media.html` en el servidor
local. `npm run export` actualiza la web estática en `dist/` (sin pruebas).

### Perfil Ray-Ban Meta (IMG)

La herramienta `?tool=img-meta` aplica fabricante, modelo, software y comentario
de dispositivo a fotos JPEG/PNG/WebP y vídeos MP4/MOV. Fotos: JPEG conservado sin
recompresión por defecto, o recorte opcional 3:4 a 3024 × 4032. PNG y WebP se
convierten a JPEG. Vídeos: metadatos QuickTime `mdta` sin recodificar las pistas.
Se preservan sus offsets sustituyendo el moov antiguo por un bloque free del
mismo tamaño y añadiendo el moov actualizado al final. No admite MP4 fragmentado.
Los datos previos ajenos al perfil pueden permanecer: no es limpieza de privacidad.
El perfil no acredita captura con gafas ni garantiza etiquetas de Instagram.
Procesamiento local, sin límite fijo de peso. La memoria disponible del navegador
determina qué archivos pueden procesarse; un archivo muy grande puede agotar la pestaña.

Investigación: https://github.com/abbibo/MetaLens- (perfiles EXIF/QuickTime).
Implementación propia, sin copiar su motor ni modificar codecs o duración.
Pruebas: `tests/meta-profile.test.mjs` y `/tests/meta-profile.html`. La prueba de
reproducción usa la muestra CC0 `flower.mp4` de MDN, guardada localmente como
`tests/output/meta-source.mp4`; no se incluye en la exportación pública.

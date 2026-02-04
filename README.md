# Analizador de Palabras Clave

Herramienta web para analizar, filtrar y exportar datos de palabras clave exportados desde KeywordTool. Funciona íntegramente en el navegador, sin servidor ni instalación necesaria. Se abre directamente con `index-improved-final.html`.

---

## Archivos del proyecto

```
├── index-improved-final.html          # Estructura HTML, los tres modos y sus paneles
├── styles-improved.css                # Estilos globales, layout, tablas, componentes UI
├── script.js                          # Lógica del modo "Un archivo"
├── addon-navegacion.js                # Navegación entre modos, Search Console y agrupación
├── script-multiple-improved.js        # Lógica del modo "Varios archivos"
└── ui-controls.js                     # Sidebar, resumen plegable, scroll nav y copiar keywords
```

### Dependencias externas (CDN, sin instalación)

| Biblioteca | Uso |
|---|---|
| [SheetJS (xlsx)](https://sheetjs.com) | Lectura y escritura de archivos Excel `.xlsx` |
| [Chart.js](https://www.chartjs.org) | Gráficas de evolución mensual por keyword |
| [JSZip](https://github.com/stlegrand/jszip) | Generación de archivos ZIP para exportación |
| [FileSaver.js](https://github.com/nicolo-ribaudo/FileSaver.js) | Descarga de archivos generados en el navegador |

---

## Cómo usar

1. Descarga todos los archivos en la misma carpeta.
2. Abre `index-improved-final.html` en un navegador moderno (Chrome, Firefox, Edge, Safari).
3. Selecciona el modo de trabajo desde la barra superior.

No hace falta conexión a internet ni servidor local, excepto para la carga inicial de las librerías CDN.

---

## Modos de trabajo

### 1. Un archivo

El modo principal. Carga un único archivo Excel exportado desde KeywordTool y ofrece el conjunto completo de filtros.

**Flujo básico:**
- Sube el archivo con el selector de fichero.
- El resumen se genera automáticamente con las frecuencias de volumen, competencia y CPC.
- Los filtros del panel izquierdo se aplican en tiempo real.
- Ordena la tabla por cualquier mes usando el selector "Ordenar por mes".

**Filtros disponibles:**

| Filtro | Comportamiento |
|---|---|
| **Volumen** | Limita por rango mínimo y/o máximo de Search Volume (Average) |
| **Nº palabras** | Muestra solo keywords con exactamente N palabras |
| **Duplicados** | Detecta keywords equivalentes ignorando orden de palabras y tildes; mantiene la de mayor volumen |
| **Búsquedas puntales** | Oculta o aísla keywords que muestran un único pico de tráfico en los datos mensuales (criterio: el pico supera 1.8× al segundo valor más alto) |
| **Excluir keywords** | Elimina cualquier keyword que contenga alguna de las palabras indicadas (separadas por coma) |
| **Incluir keywords** | Mantiene solo keywords que contengan al menos una de las palabras indicadas |
| **Agrupar por términos** | Organiza la tabla en acordeones según los términos proporcionados; cada keyword se asigna al primer término que coincida; las que no encajan van al grupo "otros" |

**Filtros del resumen:** Los valores de frecuencia en el panel de resumen son enlaces clicables. Al hacer clic en un rango de volumen, competencia o CPC, la tabla se filtra automáticamente por ese rango. El botón "Resetear resumen" elimina esos filtros sin afectar los del panel lateral.

---

### 2. Varios archivos

Permite cargar y procesar dos o más archivos Excel simultáneamente. Comparte los filtros de volumen, duplicados, inclusión y exclusión del modo anterior, y añade opciones específicas:

| Funcionalidad | Descripción |
|---|---|
| **Procesar y Mostrar** | Aplica los filtros activos y renderiza la tabla combinada |
| **Unir por Palabra Clave** | Requiere exactamente dos archivos (uno de volumen, otro de clicks). Detecta automáticamente cuál es cuál y combina las filas por keyword, rellenando campos vacíos con datos del segundo archivo. Una sola fila por keyword en el resultado |
| **Solo primera fila por archivo** | Muestra únicamente la primera fila de cada archivo tras filtrar |
| **Exportar a Excel** | Descarga todos los datos filtrados agrupados por primera palabra en un único archivo `.xlsx` con múltiples hojas (una por grupo). Los grupos con 6 o menos filas se consolidan en una hoja "Otros" |
| **Exportar en ZIP** | Mismo agrupamiento que el anterior, pero cada grupo en un archivo Excel separado dentro de un `.zip`. El nombre de cada archivo incluye el valor máximo de volumen del grupo |

---

### 3. Search Console

Combina datos de KeywordTool con métricas reales de Google Search Console.

**Flujo:**
1. Sube el archivo de keywords (KeywordTool, `.xlsx`).
2. Sube el export de Search Console (`.xlsx`). El script busca automáticamente la hoja con nombre que contenga "consulta" o "query"; si no la encuentra, usa la primera hoja.
3. Selecciona la columna de unión: por keyword/query o por URL/landing page.
4. Marca "Solo mostrar keywords con datos de Search Console" si quieres filtrar a solo las coincidencias.
5. Haz clic en "Combinar Archivos".

El resultado es una tabla con todas las columnas originales de KeywordTool más cuatro columnas de Search Console (`SC_Clicks`, `SC_Impressions`, `SC_CTR`, `SC_Position`), visualmente diferenciadas con fondo verde. Las keywords sin datos de Search Console muestran un guión (`-`) en esas columnas.

---

## Características de la tabla

### Mapa de calor mensual

Las columnas de datos mensuales (`Search Volume (Mes Año)`) se pintan automáticamente con un gradiente por fila: verde para el valor más bajo, amarillo en el punto medio y rojo para el más alto. El cálculo se hace por cada fila independientemente. La aplicación soporta archivos con cualquier número de meses (12, 24 o más), adaptándose automáticamente al número de columnas mensuales disponibles.

### Búsqueda en Google

Cada keyword en la tabla es un enlace que abre automáticamente la búsqueda correspondiente en Google en una nueva pestaña.

### Gráfica de evolución

El botón 📈 junto a cada keyword abre un popup con una gráfica de línea (Chart.js) que muestra la evolución del volumen de búsqueda a lo largo de los meses disponibles en el archivo.

### Selección y checkboxes

Cada fila tiene un checkbox individual. El checkbox de la cabecera selecciona o deselecciona todo. La selección afecta tanto a la exportación (solo se exportan las marcadas si hay alguna marcada) como al botón de copia al portapapeles.

En modo agrupado, cada grupo tiene además un checkbox propio que controla todas las filas de ese grupo, y un botón de exportación individual por grupo.

---

## Exportación y copia

### Exportar datos

En todos los modos, el botón **📥 Exportar** descarga un archivo `.xlsx` con los datos actuales. Si hay checkboxes marcados, exporta solo esas keywords; si ninguno está marcado, exporta todo lo visible tras los filtros.

### Copiar keywords al portapapeles

El botón **📋 Copiar keywords** (presente en los tres modos, junto al botón de exportación) copia las keywords a una línea por keyword, listo para pegarlo en herramientas de SERPs u otros usos.

Comportamiento:
- Si hay checkboxes marcados → copia solo esas keywords.
- Si ninguno está marcado → copia todas las keywords visibles en la tabla.
- En Search Console (sin checkboxes) → copia todas las keywords de la tabla de resultados.
- El botón muestra feedback visual: se vuelve verde con el conteo de keywords copiadas durante 1.5 segundos, o rojo si la tabla está vacía.

---

## Interfaz y layout

### Layout de dos columnas

En los modos "Un archivo" y "Varios archivos" el layout es una cuadrícula de dos columnas: panel de filtros a la izquierda (300 px, sticky) y contenido principal a la derecha. En pantallas menores de 1024 px se convierte en una única columna vertical.

### Sidebar plegable

El botón ◀ en la esquina superior del panel de filtros lo colapsa completamente hasta un botón de 40 px de ancho (▶), liberando espacio horizontal para la tabla. Al hacer clic de nuevo se expande.

### Resumen plegable

El panel de resumen tiene una cabecera clickable (▼ / ▶) que lo collapsa o expande. Útil para dar más espacio vertical a la tabla cuando ya no necesitas consultar las frecuencias.

### Barra de scroll horizontal

Sobre cada tabla aparece automáticamente una barra de navegación horizontal compacta (5 px de alto) que refleja la posición actual dentro de la tabla. Se puede hacer clic en cualquier punto de la barra para saltar a esa posición. Desaparece automáticamente cuando el contenido no desborda horizontalmente.

### Columnas sticky

Las dos primeras columnas de la tabla (checkbox y Keywords) se fijan al desplazarse horizontalmente, de modo que siempre son visibles de referencia mientras se revisan los datos mensuales a la derecha.

---

## Arquitectura del código

```
┌─────────────────────────────────────────────────────┐
│                 index-improved-final.html            │
│  (estructura HTML, los tres modos, carga de scripts) │
└───────────┬─────────────┬───────────┬───────────────┘
            │             │           │
      script.js    addon-navegacion  script-multiple-improved.js
      (modo 1)     .js               (modo 2)
                   (modo 3 +
                    agrupación)
            │             │           │
            └─────────────┴───────────┘
                          │
                   ui-controls.js
          (sidebar, resumen, scroll nav, copiar)
```

| Archivo | Responsabilidad |
|---|---|
| `script.js` | Carga de Excel, filtrado central, resumen con enlaces clicables, generación de tabla, mapa de calor, gráfica de evolución. Todo el estado del modo "Un archivo" vive aquí. |
| `addon-navegacion.js` | Navegación entre los tres modos (visibilidad de secciones), popup de información, toda la lógica de Search Console (carga, unión, renderizado) y las funciones globales de agrupación (`agruparYMostrarKeywords`, `generarHTMLGrupos`, `exportarGrupo`). |
| `script-multiple-improved.js` | Estado y lógica del modo "Varios archivos": carga de múltiples archivos, unión por palabra clave, filtrado, resumen, renderizado de tabla o agrupados, exportación a Excel/agrupado/ZIP. |
| `ui-controls.js` | Interacciones de interfaz transversales a todos los modos: colapso del sidebar, toggle del resumen, barras de scroll horizontal y copia de keywords al portapapeles. Se ejecuta como IIFE y no expone estado global. |
| `styles-improved.css` | Todo el CSS: header, grid de dos columnas, sidebar plegable, cards, filtros, tablas con sticky columns y mapa de calor, acordeones de agrupación, scroll nav, botones, popup gráfica, responsive. |

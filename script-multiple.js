

document.addEventListener("DOMContentLoaded", () => {
  const mm_rangosVolume = [
    { label: "0", min: 0, max: 0 },
    { label: "10-100", min: 10, max: 100 },
    { label: "110-500", min: 110, max: 500 },
    { label: "510-1000", min: 510, max: 1000 },
    { label: "1010-3000", min: 1010, max: 3000 },
    { label: "3010-10000", min: 3010, max: 10000 },
    { label: "10000-50000", min: 10000, max: 50000 },
    { label: "50001+", min: 50001, max: Infinity }
  ];

  let mm_archivosDatos = [];
  let mm_datosCombinados = [];
  let mm_datosFiltrados = [];


  function mm_cleanNumber(numStr) {
    if (typeof numStr === "number") return numStr;
    if (!numStr) return 0;
    let cleaned = String(numStr).replace(/[.,\s]/g, "").replace(/[^0-9]/g, "");
    let n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
  }

  function mm_normalizaDuplicado(txt) {
    let normalized = (txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let words = normalized.trim().toLowerCase().split(/\s+/).filter(Boolean);
    words.sort();
    return words.join(" ");
  }

  const multiInput = document.getElementById("mm_multiFileInput");
  if (multiInput) {
    multiInput.addEventListener("change", (e) => {
      const fileList = e.target.files;
      mm_archivosDatos = [];
      if (!fileList || !fileList.length) {
        alert("No se han seleccionado archivos");
        return;
      }
      document.getElementById("mm_nombreArchivos").innerText = Array.from(
        fileList
      )
        .map((f, i) => `${i + 1}: ${f.name}`)
        .join(", ");

      let leidos = 0;
      Array.from(fileList).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          const datos = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          mm_archivosDatos.push({ nombre: file.name, data: datos });
          leidos++;
          if (leidos === fileList.length) {
            mm_datosCombinados = [].concat(
              ...mm_archivosDatos.map((a) => a.data)
            );
            mm_aplicarFiltros();
          }
        };
        reader.readAsArrayBuffer(file);
      });
    });
  }






  // Función unir datos completa con renombre
  function unirPorPalabraClaveCompleta(datosA, datosB) {
    console.log("Ejecutando unión de datos corregida...");
    const mapa = new Map();

    // Añadir filas del primer archivo
    datosA.forEach(row => {
      const clave = (row["Keywords"] || row["Keyword"] || row["Palabra clave"] || "").trim().toLowerCase();
      if (!clave) return;
      mapa.set(clave, { ...row });
    });

    // Unión con filas del segundo archivo sin duplicar datos ya existentes
    datosB.forEach(row => {
      const clave = (row["Keywords"] || row["Keyword"] || row["Palabra clave"] || "").trim().toLowerCase();
      if (!clave) return;

      if (mapa.has(clave)) {
        const filaExistente = mapa.get(clave);
        Object.entries(row).forEach(([key, value]) => {
          // Si el campo no existe o está vacío, lo añadimos o sobrescribimos
          if (!filaExistente.hasOwnProperty(key) || filaExistente[key] === "" || filaExistente[key] === null || filaExistente[key] === undefined) {
            filaExistente[key] = value;
          }
          // Si quieres evitar sobrescribir incluso si existe, comenta esta línea
        });
        mapa.set(clave, filaExistente);
      } else {
        mapa.set(clave, { ...row });
      }
    });

    const resultado = Array.from(mapa.values());
    console.log(`Datos combinados sin duplicados: ${resultado.length} filas`);
    return resultado;
  }


  // Función para reordenar columnas
  function reordenarColumnas(datos, archivoVolumen, archivoClicks) {
    // Obtener columnas principales (ordenadas) del archivo de volumen
    const colsVolumen = Object.keys(archivoVolumen[0] || {});
    const colsClicks = Object.keys(archivoClicks[0] || {});
    // Tomar las dos primeras columnas como "Keywords" y "Search Volume (Average)" o equivalentes
    const columnasPrincipales = colsVolumen.slice(0, 2);
    // El resto columnas volumen, excluyendo las dos primeras
    const restoColsVolumen = colsVolumen.slice(2);
    // Columnas clicks que no estén ya en volumen
    const colsClicksFiltradas = colsClicks.filter(c => !colsVolumen.includes(c));
    // Orden final: primeras dos columnas volumen + resto columnas volumen + cols clicks filtradas
    const columnasOrdenadas = [...columnasPrincipales, ...restoColsVolumen, ...colsClicksFiltradas];
    // Transformar cada fila manteniendo solo estas columnas en orden
    return datos.map(fila => {
      const nuevaFila = {};
      columnasOrdenadas.forEach(col => {
        nuevaFila[col] = fila[col] !== undefined ? fila[col] : "";
      });

      // Mantener otras columnas no contempladas al final
      for (const key in fila) {
        if (!columnasOrdenadas.includes(key)) {
          nuevaFila[key] = fila[key];
        }
      }
      return nuevaFila;
    });
  }

  // Exportar Excel función
  function exportarExcel(datos, nombreArchivo = "palabras-combinadas.xlsx") {
    console.log("Exportando Excel...");
    if (!datos || !datos.length) {
      alert("No hay datos para exportar");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combinado");
    XLSX.writeFile(wb, nombreArchivo);
    console.log("Exportación completada");
  }

  // Listener para botón Unir archivos, accediendo a variables globales
  const btnUnirArchivos = document.getElementById("mmbtnUnirArchivos");
  if (!btnUnirArchivos) {
    console.warn("Botón mmbtnUnirArchivos no encontrado");
  } else {
    btnUnirArchivos.addEventListener("click", () => {
      if (!mm_archivosDatos || mm_archivosDatos.length !== 2) {
        alert("Selecciona exactamente dos archivos: uno de volumen y otro de clicks");
        return;
      }

      const [archivo1, archivo2] = mm_archivosDatos.map(a => a.data);

      // Detectar cuál tiene las dos primeras columnas esperadas (por ejemplo "Keywords" y "Search Volume (Average)")
      const esArchivoVolumen1 = archivo1.length > 0 && 
        Object.keys(archivo1[0]).slice(0,2).includes("Keywords") && 
        Object.keys(archivo1[0]).slice(0,2).includes("Search Volume (Average)");

      const datosVolumen = esArchivoVolumen1 ? archivo1 : archivo2;
      const datosClicks = esArchivoVolumen1 ? archivo2 : archivo1;

      mmdatosCombinados = unirPorPalabraClaveCompleta(datosVolumen, datosClicks);

      // Ordenar columnas según detectado
      mmdatosCombinados = reordenarColumnas(mmdatosCombinados, datosVolumen, datosClicks);

      mm_datosFiltrados = [...mmdatosCombinados];

      // Mostrar resultado en interfaz
      const resumen = document.getElementById("mm_resumenMultiples");
      if (resumen) {
        resumen.innerHTML = `<strong>Archivos combinados:</strong> ${mmdatosCombinados.length} filas totales.`;
      }
      mm_renderTablaYResumen();

      // Exportar automáticamente
      exportarExcel(mmdatosCombinados);
    });
  }


  // Filtros 
  function mm_aplicarFiltros() {
    let resultado = [...mm_datosCombinados];

    if (document.getElementById("mm_filtroVolumen")?.checked) {
      const minVol =
        parseInt(document.getElementById("mm_minVolume").value, 10) || 0;
      const maxVol =
        parseInt(document.getElementById("mm_maxVolume").value, 10) || Infinity;
      resultado = resultado.filter((row) => {
        const vol = mm_cleanNumber(row["Search Volume (Average)"]);
        return vol >= minVol && vol <= maxVol;
      });
    }

    if (document.getElementById("mm_filtroDuplicados")?.checked) {
      const itemsByKeyword = {};
      resultado.forEach((row) => {
        const kNorm = mm_normalizaDuplicado(row["Keywords"]);
        const currVol = mm_cleanNumber(row["Search Volume (Average)"]);
        if (
          !itemsByKeyword[kNorm] ||
          mm_cleanNumber(itemsByKeyword[kNorm]["Search Volume (Average)"]) <
            currVol
        ) {
          itemsByKeyword[kNorm] = row;
        }
      });
      resultado = Object.values(itemsByKeyword);
    }

    if (document.getElementById("mm_filtroExcluir")?.checked) {
      const excludeRaw = document.getElementById("mm_excludeWordsInput").value;
      if (excludeRaw.trim()) {
        const words = excludeRaw
          .split(",")
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean);
        resultado = resultado.filter((row) => {
          const keyword = (row["Keywords"] || "").toLowerCase();
          return !words.some((w) => keyword.includes(w));
        });
      }
    }

    if (document.getElementById("mm_filtroIncluir")?.checked) {
      const incluirRaw = document.getElementById("mm_incluirWordsInput").value;
      if (incluirRaw.trim()) {
        const words = incluirRaw
          .split(",")
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean);
        resultado = resultado.filter((row) => {
          const keyword = (row["Keywords"] || "").toLowerCase();
          return words.some((w) => keyword.includes(w));
        });
      }
    }

    if (document.getElementById("mm_soloPrimerDato")?.checked) {
      let primeros = [];
      mm_archivosDatos.forEach((fileObj) => {
        const datosFiltradosPorArchivo = resultado.filter((r) =>
          fileObj.data.includes(r)
        );
        if (datosFiltradosPorArchivo.length > 0)
          primeros.push(datosFiltradosPorArchivo[0]);
      });
      resultado = primeros;
    }

    // Ordenar por la segunda columna descendente
    resultado.sort((a, b) => {
      const key = Object.keys(a)[1];
      const valA = a[key] || 0;
      const valB = b[key] || 0;
      const numA =
        typeof valA === "number"
          ? valA
          : parseFloat(valA.toString().replace(/,/g, ""));
      const numB =
        typeof valB === "number"
          ? valB
          : parseFloat(valB.toString().replace(/,/g, ""));
      return (numB || 0) - (numA || 0);
    });

    mm_datosFiltrados = resultado;
    mm_renderTablaYResumen();
  }

  function mm_renderTablaYResumen() {
    const data = mm_datosFiltrados.length
      ? mm_datosFiltrados
      : mm_datosCombinados;
    if (!data || !data.length) {
      document.getElementById("mm_resumenMultiples").innerHTML =
        "No hay datos cargados.";
      document.getElementById("mm_tablaMultiples").innerHTML = "";
      return;
    }

    const keys = Object.keys(data[0]);

    const columnasParaColorear = keys.filter(k => {
      return k.startsWith("Search Volume") && !k.toLowerCase().includes("average");
    });

    function colorSegunValor(valor, min, max) {
      if (valor === null || valor === undefined || isNaN(valor)) return "";
      if (max === min) return "background-color: rgba(234, 255, 0, 1); color: white;"; // Evitar división entre 0
      const p = Math.min(Math.max((valor - min) / (max - min), 0), 1);
      const r = Math.round(255 * p);
      const g = Math.round(255 * (1 - p));
      return `background-color: rgb(${r},${g},0); color: white;`;
    }

    let tablaHtml = `<table border="1" cellpadding="3" style="font-size:0.85em"><thead><tr>`;
    keys.forEach(k => tablaHtml += `<th>${k}</th>`);
    tablaHtml += `</tr></thead><tbody>`;

    data.forEach(row => {
      tablaHtml += "<tr>";
      const valoresFila = columnasParaColorear
        .map(col => parseFloat(row[col]))
        .filter(v => !isNaN(v));

      const minFila = Math.min(...valoresFila);
      const maxFila = Math.max(...valoresFila);

      keys.forEach(k => {
        const valorCelda = row[k];
        let estilo = "";

        if (columnasParaColorear.includes(k)) {
          const valNum = parseFloat(valorCelda);
          if (!isNaN(valNum)) {
            estilo = colorSegunValor(valNum, minFila, maxFila);
          }
        }

        tablaHtml += `<td style="${estilo}">${valorCelda ?? ""}</td>`;
      });

      tablaHtml += "</tr>";
    });

    tablaHtml += "</tbody></table>";

    document.getElementById("mm_resumenMultiples").innerHTML = `<strong>Filas:</strong> ${data.length}`;
    document.getElementById("mm_tablaMultiples").innerHTML = tablaHtml;
  }
/*     let freqVol = {};
    data.forEach((row) => {
      const v = mm_cleanNumber(row["Search Volume (Average)"]);
      const grupo = mm_rangosVolume.find((r) => v >= r.min && v <= r.max);
      if (grupo) freqVol[grupo.label] = (freqVol[grupo.label] || 0) + 1;
    });

    let resumenHtml = `<strong>Filas actuales:</strong> ${data.length} <br><br><strong>Distribución volumen:</strong><br>`;
    mm_rangosVolume.forEach((r) => {
      if (freqVol[r.label]) resumenHtml += `${r.label}: ${freqVol[r.label]} &nbsp;&nbsp;`;
    });

    const keys = Object.keys(data[0]);
    let tablaHtml = `<table border="1" cellpadding="3" style="font-size:0.85em"><thead><tr>`;
    keys.forEach((k) => (tablaHtml += `<th>${k}</th>`));
    tablaHtml += `</tr></thead><tbody>`;
    data.forEach((row) => {
      tablaHtml += `<tr>`;
      keys.forEach((k) => {
        tablaHtml += `<td>${row[k] ?? ""}</td>`;
      });
      tablaHtml += `</tr>`;
    });
    tablaHtml += `</tbody></table>`;

    document.getElementById("mm_resumenMultiples").innerHTML = resumenHtml;
    document.getElementById("mm_tablaMultiples").innerHTML = tablaHtml; 
}*/
  


  // Exportar simple
  const btnExportarSimples = document.getElementById("mm_btnExportarMultiples");
  if (btnExportarSimples) {
    btnExportarSimples.addEventListener("click", () => {
      if (!mm_datosFiltrados.length) {
        alert("¡No hay datos para exportar!");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(mm_datosFiltrados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Filtrados");
      XLSX.writeFile(wb, "palabras_clave_filtradas.xlsx");
    });
  }

  // Exportar agrupado
  function mm_exportarConAgrupacion() {
    if (!mm_datosFiltrados.length) {
      alert("No hay datos para exportar");
      return;
    }

    const grupos = {};
    const otros = [];

    mm_datosFiltrados.forEach((row) => {
      let keywords = (row["Keywords"] || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const claveGrupo = keywords.split(/\s+/)[0] || "otros";

      if (!grupos[claveGrupo]) grupos[claveGrupo] = [];
      grupos[claveGrupo].push(row);
    });

    Object.entries(grupos).forEach(([grupo, filas]) => {
      if (filas.length <= 6) {
        otros.push(...filas);
        delete grupos[grupo];
      }
    });

    if (otros.length > 0) {
      grupos["Otros"] = otros;
    }

    const wb = XLSX.utils.book_new();

    Object.entries(grupos).forEach(([grupo, filas]) => {
      const ws = XLSX.utils.json_to_sheet(filas);
      XLSX.utils.book_append_sheet(wb, ws, grupo.substring(0, 31));
    });

    XLSX.writeFile(wb, "clave_agrupadas.xlsx");
  }
  const btnExportarAgrup = document.getElementById("mm_btnExportarAgrupado");
  if (btnExportarAgrup) {
    btnExportarAgrup.addEventListener("click", mm_exportarConAgrupacion);
  }

  // Exportar a archivos separados en ZIP
  async function mm_exportarZip() {
    if (!mm_datosFiltrados.length) {
      alert("No hay datos para exportar");
      return;
    }

    const grupos = {};
    const otros = [];

    mm_datosFiltrados.forEach((row) => {
      let keywords = (row["Keywords"] || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const claveGrupo = keywords.split(/\s+/)[0] || "otros";

      if (!grupos[claveGrupo]) grupos[claveGrupo] = [];
      grupos[claveGrupo].push(row);
    });

    Object.entries(grupos).forEach(([grupo, filas]) => {
      if (filas.length <= 6) {
        otros.push(...filas);
        delete grupos[grupo];
      }
    });
    if (otros.length > 0) {
      grupos["Otros"] = otros;
    }

    const zip = new JSZip();

    Object.entries(grupos).forEach(([grupo, filas]) => {
      // Obtener la segunda columna (índice 1) y calcular el valor máximo
      const keys = Object.keys(filas[0]);
      const segundaColumna = keys[1]; // Asumimos que es la segunda columna

      const maxValor = Math.max(
        ...filas.map((row) => mm_cleanNumber(row[segundaColumna]))
      );

      // Crear libro Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);
      XLSX.utils.book_append_sheet(wb, ws, grupo.substring(0, 31));

      // Generar nombre: palabras_clave_grupo_maxValor.xlsx
      const nombreArchivo = `palabras_clave_${grupo.substring(0, 20)}_${maxValor}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      zip.file(nombreArchivo, wbout);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `palabras_clave_grupos.zip`);
  }

  const btnExportarSeparados = document.getElementById("mm_btnExportarSeparados");
  if (btnExportarSeparados) {
    btnExportarSeparados.addEventListener("click", mm_exportarZip);
  }

  document.getElementById("mm_btnExportarZip").addEventListener("click", mm_exportarZip);
  document.getElementById("mm_btnProcesar").addEventListener("click", mm_aplicarFiltros);

});


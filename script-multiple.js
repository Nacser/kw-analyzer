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

  const mm_rangosCompetition = [
    { label: "0-0.2", min: 0, max: 0.2 },
    { label: "0.2-0.4", min: 0.2, max: 0.4 },
    { label: "0.4-0.6", min: 0.4, max: 0.6 },
    { label: "0.6-0.8", min: 0.6, max: 0.8 },
    { label: "0.8-1.0", min: 0.8, max: 1.0 }
  ];

  const mm_bloquesCPC = [
    { label: "0-0.1", min: 0, max: 0.1 },
    { label: "0.1-0.2", min: 0.1, max: 0.2 },
    { label: "0.2-0.5", min: 0.2, max: 0.5 },
    { label: "0.5-1.0", min: 0.5, max: 1.0 },
    { label: ">1.0", min: 1.0, max: Infinity }
  ];

  let mm_archivosDatos = [];
  let mm_datosCombinados = [];
  let mm_datosFiltrados = [];
  let mm_filtroResumenVolume = null;
  let mm_filtroResumenCompetition = null;
  let mm_filtroResumenCPC = null;

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

    // Filtros de resumen (clicables)
    if (mm_filtroResumenVolume) {
      const rango = mm_rangosVolume.find(r => r.label === mm_filtroResumenVolume);
      if (rango) {
        resultado = resultado.filter(row => {
          const v = mm_cleanNumber(row["Search Volume (Average)"]);
          return v >= rango.min && v <= rango.max;
        });
      }
    }
    if (mm_filtroResumenCompetition) {
      const rango = mm_rangosCompetition.find(r => r.label === mm_filtroResumenCompetition);
      if (rango) {
        resultado = resultado.filter(row => {
          let v = Number(row["Competition"]);
          v = isNaN(v) ? 0 : v;
          return v >= rango.min && v <= rango.max;
        });
      }
    }
    if (mm_filtroResumenCPC) {
      const rango = mm_bloquesCPC.find(r => r.label === mm_filtroResumenCPC);
      if (rango) {
        resultado = resultado.filter(row => {
          let cpcStr = String(row["Average CPC (EUR)"] || "0").replace(",", ".");
          let v = parseFloat(cpcStr);
          v = isNaN(v) ? 0 : v;
          return v >= rango.min && v < rango.max;
        });
      }
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
      document.getElementById("mm_resumenMultiples").innerHTML = "No hay datos cargados.";
      document.getElementById("mm_tablaMultiples").innerHTML = "";
      return;
    }

    const keys = Object.keys(data[0]);

    // ============= RESUMEN CON ENLACES CLICABLES =============
    const freqRangosVolume = {};
    data.forEach(row => {
      const v = mm_cleanNumber(row["Search Volume (Average)"]);
      const grupo = mm_rangosVolume.find(r => v >= r.min && v <= r.max);
      freqRangosVolume[grupo ? grupo.label : "Otro"] = (freqRangosVolume[grupo ? grupo.label : "Otro"] || 0) + 1;
    });
    const freqRangosCompetition = {};
    data.forEach(row => {
      let v = Number(row["Competition"]); v = isNaN(v) ? 0 : v;
      const grupo = mm_rangosCompetition.find(r => v >= r.min && v <= r.max);
      freqRangosCompetition[grupo ? grupo.label : "Otro"] = (freqRangosCompetition[grupo ? grupo.label : "Otro"] || 0) + 1;
    });
    const freqBloquesCPC = {};
    data.forEach(row => {
      let v = parseFloat(String(row["Average CPC (EUR)"] || "0").replace(",", ".")); v = isNaN(v) ? 0 : v;
      const grupo = mm_bloquesCPC.find(r => v >= r.min && v < r.max);
      freqBloquesCPC[grupo ? grupo.label : ">1.0"] = (freqBloquesCPC[grupo ? grupo.label : ">1.0"] || 0) + 1;
    });

    let resumenHtml = `<div><button id="mm_btnResetResumen">Resetear resumen</button>`;
    resumenHtml += `<p><strong>Filas cargadas:</strong> ${data.length}</p>`;

    // Filtros activos
    let filtrosActivos = [];
    if (document.getElementById('mm_filtroVolumen')?.checked) filtrosActivos.push("volumen");
    if (document.getElementById('mm_filtroDuplicados')?.checked) filtrosActivos.push("duplicados");
    if (document.getElementById('mm_filtroExcluir')?.checked) filtrosActivos.push("palabras excluidas");
    if (document.getElementById('mm_filtroIncluir')?.checked) filtrosActivos.push("inclusión de palabras");
    if (mm_filtroResumenVolume) filtrosActivos.push(`Volume (${mm_filtroResumenVolume})`);
    if (mm_filtroResumenCompetition) filtrosActivos.push(`Competition (${mm_filtroResumenCompetition})`);
    if (mm_filtroResumenCPC) filtrosActivos.push(`CPC (${mm_filtroResumenCPC})`);
    if (filtrosActivos.length) resumenHtml += `<p><strong>Filtros activos:</strong> ${filtrosActivos.join(', ')}</p>`;
    resumenHtml += `</div>`;

    // Volumen
    resumenHtml += `<div><strong>Frecuencia Search Volume (Average):</strong><br>`;
    mm_rangosVolume.sort((a,b) => a.min - b.min).forEach(r => {
      const count = freqRangosVolume[r.label] || 0;
      if (count > 0) resumenHtml += `<a href="#" class="mm_filtroVolume" data-label="${r.label}">${r.label}: <b>${count}</b></a><br>`;
    });
    resumenHtml += `</div>`;

    // Competition
    resumenHtml += `<div><strong>Rangos Competition:</strong><br>`;
    mm_rangosCompetition.sort((a,b) => a.min - b.min).forEach(r => {
      const count = freqRangosCompetition[r.label] || 0;
      if (count > 0) resumenHtml += `<a href="#" class="mm_filtroCompetition" data-label="${r.label}">${r.label}: <b>${count}</b></a><br>`;
    });
    resumenHtml += `</div>`;

    // CPC
    resumenHtml += `<div><strong>Average CPC (EUR):</strong><br>`;
    mm_bloquesCPC.sort((a,b) => a.min - b.min).forEach(r => {
      const count = freqBloquesCPC[r.label] || 0;
      if (count > 0) resumenHtml += `<a href="#" class="mm_filtroCPC" data-label="${r.label}">${r.label}: <b>${count}</b></a><br>`;
    });
    resumenHtml += `</div>`;

    document.getElementById("mm_resumenMultiples").innerHTML = resumenHtml;

    // Listeners de enlaces de resumen
    setTimeout(() => {
      document.querySelectorAll('.mm_filtroVolume').forEach(el => {
        el.onclick = function(e) { e.preventDefault(); mm_filtroResumenVolume = this.getAttribute('data-label'); mm_aplicarFiltros(); };
      });
      document.querySelectorAll('.mm_filtroCompetition').forEach(el => {
        el.onclick = function(e) { e.preventDefault(); mm_filtroResumenCompetition = this.getAttribute('data-label'); mm_aplicarFiltros(); };
      });
      document.querySelectorAll('.mm_filtroCPC').forEach(el => {
        el.onclick = function(e) { e.preventDefault(); mm_filtroResumenCPC = this.getAttribute('data-label'); mm_aplicarFiltros(); };
      });
      const btnReset = document.getElementById('mm_btnResetResumen');
      if (btnReset) {
        btnReset.onclick = function() {
          mm_filtroResumenVolume = null;
          mm_filtroResumenCompetition = null;
          mm_filtroResumenCPC = null;
          mm_aplicarFiltros();
        };
      }
    }, 50);

    // ============= TABLA O GRUPOS =============
    // Detectar columnas de meses (mismo regex que script.js)
    const mesesRegex = /\(([a-zA-Z]{3})\s\d{4}\)/i;
    const monthColumns = keys.filter(k => mesesRegex.test(k));

    // Verificar si hay agrupación activa
    const mmFiltroAgrupar = document.getElementById('mm_filtroAgrupar');
    if (mmFiltroAgrupar && mmFiltroAgrupar.checked && window.agruparYMostrarKeywords) {
      const gruposData = window.agruparYMostrarKeywords(data, 'mm_agruparInput');
      if (gruposData) {
        const htmlGrupos = window.generarHTMLGrupos(gruposData, keys);
        if (htmlGrupos) {
          document.getElementById("mm_tablaMultiples").innerHTML = htmlGrupos;

          // Listeners acordeones DENTRO del contenedor mm_tablaMultiples
          setTimeout(() => {
            const container = document.getElementById('mm_tablaMultiples');
            container.querySelectorAll('.grupo-header').forEach(header => {
              header.onclick = function() {
                const accordion = this.closest('.grupo-accordion');
                const content = accordion.querySelector('.grupo-content');
                const toggle = this.querySelector('.grupo-toggle');
                if (content.style.display === 'none' || content.style.display === '') {
                  content.style.display = 'block';
                  toggle.textContent = '▼';
                } else {
                  content.style.display = 'none';
                  toggle.textContent = '▶';
                }
              };
            });
            container.querySelectorAll('.btn-export-group').forEach(btn => {
              btn.onclick = function(e) {
                e.stopPropagation();
                const grupo = this.getAttribute('data-grupo');
                if (window.exportarGrupo) window.exportarGrupo(grupo, gruposData.grupos[grupo]);
              };
            });
            container.querySelectorAll('.select-all-group').forEach(cb => {
              cb.onclick = function(e) {
                e.stopPropagation();
                const grupoContent = this.closest('.grupo-accordion').querySelector('.grupo-content');
                if (grupoContent) grupoContent.querySelectorAll('.keyword-checkbox').forEach(ch => { ch.checked = cb.checked; });
              };
            });
            container.querySelectorAll('.btn-chart').forEach(btn => {
              btn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (window.mostrarGraficaKeyword) window.mostrarGraficaKeyword(btn.getAttribute('data-keyword'));
              };
              btn.onmouseenter = function() { this.style.transform = 'scale(1.2)'; };
              btn.onmouseleave = function() { this.style.transform = 'scale(1)'; };
            });
          }, 50);

          return;
        }
      }
    }

    // Tabla normal
    let tablaHtml = '<table><thead><tr>';
    tablaHtml += '<th style="width:40px;"><input type="checkbox" id="mm-select-all-keywords" style="width:18px;height:18px;cursor:pointer;" title="Seleccionar todo"></th>';
    keys.forEach(k => tablaHtml += `<th>${k}</th>`);
    tablaHtml += '</tr></thead><tbody>';

    data.forEach(row => {
      const valoresFila = monthColumns.map(k => {
        const val = row[k];
        if (val == null || val === "") return 0;
        const n = parseFloat(String(val).replace(/,/g, ""));
        return isNaN(n) ? 0 : n;
      });
      const min = Math.min(...valoresFila);
      const max = Math.max(...valoresFila);
      const rango = max === min ? 1 : max - min;

      tablaHtml += '<tr>';
      tablaHtml += `<td style="text-align:center;"><input type="checkbox" class="mm-keyword-checkbox" data-keyword="${row['Keywords'] || ''}" style="width:18px;height:18px;cursor:pointer;"></td>`;

      keys.forEach(k => {
        let style = "";
        if (monthColumns.includes(k)) {
          const val = row[k];
          let numValue = 0;
          if (val != null && val !== "") { const n = parseFloat(String(val).replace(/,/g,"")); numValue = isNaN(n)?0:n; }
          let p = (numValue - min) / rango;
          let r, g;
          if (p <= 0.5) { r = Math.round(2*p*255); g = 255; }
          else { r = 255; g = Math.round(2*(1-p)*255); }
          style = `background:rgb(${r},${g},0);`;
        }
        if (k === 'Keywords' && row[k]) {
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(row[k])}`;
          tablaHtml += `<td style="display:flex;align-items:center;gap:8px;padding:8px;">
            <a href="${googleUrl}" target="_blank" style="color:#667eea;text-decoration:none;flex:1;" title="Buscar en Google">${row[k]}</a>
            <button class="mm-btn-chart" data-keyword="${row[k]}" title="Ver evolución" style="background:none;border:none;cursor:pointer;font-size:18px;padding:4px;transition:transform 0.2s;">📈</button>
          </td>`;
        } else {
          tablaHtml += `<td style="${style}">${row[k] ?? ""}</td>`;
        }
      });
      tablaHtml += '</tr>';
    });
    tablaHtml += '</tbody></table>';

    document.getElementById("mm_tablaMultiples").innerHTML = tablaHtml;

    // Listeners tabla normal
    setTimeout(() => {
      const selectAll = document.getElementById('mm-select-all-keywords');
      if (selectAll) {
        selectAll.onclick = function() {
          document.querySelectorAll('.mm-keyword-checkbox').forEach(cb => { cb.checked = selectAll.checked; });
        };
      }
      document.querySelectorAll('.mm-btn-chart').forEach(btn => {
        btn.onclick = function(e) {
          e.preventDefault(); e.stopPropagation();
          if (window.mostrarGraficaKeyword) window.mostrarGraficaKeyword(btn.getAttribute('data-keyword'));
        };
        btn.onmouseenter = function() { this.style.transform = 'scale(1.2)'; };
        btn.onmouseleave = function() { this.style.transform = 'scale(1)'; };
      });
    }, 50);
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
  const btnExportarMultiples = document.getElementById("mm_btnExportarMultiples");
  if (btnExportarMultiples) {
    btnExportarMultiples.addEventListener("click", mm_exportarConAgrupacion);
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

  // Listeners automáticos para filtros - aplicar sin botón
  const filtrosAutoApply = [
    'mm_filtroVolumen',
    'mm_filtroDuplicados',
    'mm_filtroExcluir',
    'mm_filtroIncluir',
    'mm_soloPrimerDato'
  ];

  filtrosAutoApply.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('change', mm_aplicarFiltros);
    }
  });

  // Listeners para inputs de texto - aplicar al cambiar
  const inputsAutoApply = [
    'mm_minVolume',
    'mm_maxVolume',
    'mm_excludeWordsInput',
    'mm_incluirWordsInput'
  ];

  inputsAutoApply.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', debounce(mm_aplicarFiltros, 500));
    }
  });

  // Función debounce para evitar múltiples llamadas
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }


  // Listener para agrupación en múltiples archivos
  const mmFiltroAgrupar = document.getElementById('mm_filtroAgrupar');
  if (mmFiltroAgrupar) {
    mmFiltroAgrupar.addEventListener('change', function() {
      mm_renderTablaYResumen();
    });
  }
  // Listener para input de agrupación
  const mmAgruparInput = document.getElementById('mm_agruparInput');
  if (mmAgruparInput) {
    mmAgruparInput.addEventListener('input', function() {
      if (document.getElementById('mm_filtroAgrupar')?.checked) {
        mm_renderTablaYResumen();
      }
    });
  }

});


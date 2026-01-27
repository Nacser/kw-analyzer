// ---- BLOQUE 1: VARIABLES Y RANGOS GLOBALES ----
document.addEventListener("DOMContentLoaded", () => {
let excelData = [];
let filteredData = [];
let isVolumeFilter = false;
let filtroResumenVolume = null;
let filtroResumenCompetition = null;
let filtroResumenCPC = null;

const rangosVolume = [
  { label: "0", min: 0, max: 0 },
  { label: "10-100", min: 10, max: 100 },
  { label: "110-500", min: 110, max: 500 },
  { label: "510-1000", min: 510, max: 1000 },
  { label: "1010-3000", min: 1010, max: 3000 },
  { label: "3010-10000", min: 3010, max: 10000 },
  { label: "10000-50000", min: 10000, max: 50000 },
  { label: "50001+", min: 50001, max: Infinity }
];

const rangosCompetition = Array.from({length: 11}, (_,i) =>
  ({ label: `${i*10}-${i*10+9}`, min: i*10, max: i*10+9 })
);

const bloquesCPC = Array.from({length: 11}, (_,i) =>
  ({ label: `${(i*0.1).toFixed(1)}-${((i+1)*0.1).toFixed(1)}`, min: i*0.1, max: (i+1)*0.1 })
);


// ---------- BLOQUE 2: FUNCIONES AUXILIARES Y UTILIDADES ----------

// Limpia un número: quita puntos, comas y espacios para convertirlo en un number JS estándar.
// Devuelve 0 si el input es nulo o NaN.
function cleanNumber(numStr) {
    if (typeof numStr === 'number') return numStr;
    if (!numStr) return 0;
    let cleaned = String(numStr).replace(/[.,\s]/g, '').replace(/[^0-9]/g, '');
    let n = parseInt(cleaned, 10);
    if (isNaN(n)) return 0;
    return n;
}

// Detecta picos de usuarios por meses
function tieneUnicoPico(row, columnNames) {
    const valores = columnNames.map(col => cleanNumber(row[col]));
    if (valores.length < 2) return false;
    const max = Math.max(...valores);
    const maxIndex = valores.indexOf(max);
    const resto = valores.filter((v, i) => i !== maxIndex);
    const segundoMax = resto.length ? Math.max(...resto) : 0;
    // Criterio: pico mínimo el doble del segundo mayor
    if (max >= 1.8 * (segundoMax || 1) && resto.every(v => v <= segundoMax)) {
        return true;
    }
    return false;
}

// Normaliza un texto clave para comparación de duplicados o palabras.
// Quita tildes y lo convierte a minúsculas.
function normalizaDuplicado(txt) {
    // Quita tildes y caracteres raros
    let normalized = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Divide en palabras, quita dobles espacios, pasa a minúsculas
    let palabras = normalized
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean); // Quita vacíos
    // Ordena palabras alfabéticamente
    palabras.sort();
    // Junta de nuevo para hacer comparación
    return palabras.join(" ");
}

// Si quieres otra utilidad para parsear floats en estilo europeo:
function parseEURfloat(str) {
    if (!str) return 0;
    let s = String(str).replace(",", ".").replace(/[^\d.]/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}


// ---------- BLOQUE 3: CARGA Y LECTURA DE ARCHIVO EXCEL ----------

// Función principal de carga de archivo Excel
function handleFile(e) {
    const fileList = e.target.files;
    if (!fileList || !fileList.length) {
        alert('No hay archivo seleccionado');
        return;
    }

    const file = fileList[0];
    const reader = new FileReader();
    reader.onload = function(ev) {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.SheetNames[0];
        // Convierte la hoja a array de objetos JS
        excelData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        // Resetea cualquier filtrado previo
        filteredData = [];
        // Genera ordenacion por mes 
        const mesesRegex = /Search Volume \(([a-zA-Z]{3}) (\d{4})\)/;
        const monthColumns = Object.keys(excelData[0]).filter(key => mesesRegex.test(key));
        monthColumns.sort((a, b) => {
          const [_, mA, yA] = a.match(mesesRegex);
          const [__, mB, yB] = b.match(mesesRegex);
          const meses = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
                 Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11};
          return Number(yA) - Number(yB) || meses[mA] - meses[mB];
        });
        // Solo si el elemento existe en el DOM
        const select = document.getElementById('selectMes');
        if(select) {
            select.innerHTML = "";

            // Primero, añade Search Volume (Average)
            if ('Search Volume (Average)' in excelData[0]) {
                const optAvg = document.createElement("option");
                optAvg.value = 'Search Volume (Average)';
                optAvg.textContent = 'Search Volume (Average)';
                select.appendChild(optAvg);
            }

            // Luego añade los meses normalmente
            monthColumns.forEach(col => {
                const opt = document.createElement("option");
                opt.value = col;
                opt.textContent = col.replace("Search Volume ",""); // opcional: oculta el prefijo
                select.appendChild(opt);
            });
            if (!select.hasAttribute('listener-attached')) {
                select.addEventListener('change', aplicarFiltrosMultiplesYResumen);
                select.setAttribute('listener-attached','true');
            }
        }


        // Pintar el resumen y tabla
        showSummaryAndTable();
    };

    reader.readAsArrayBuffer(file);
}

// Conexión al input file en tu HTML
document.getElementById('fileInput').addEventListener('change', handleFile);


// ---------- BLOQUE 4: FILTRADO CENTRAL ----------

function aplicarFiltrosMultiplesYResumen() {
  let resultado = [...excelData];

  // ----- Filtros generales -----
  if (document.getElementById('filtroVolumen')?.checked) {
    const minVolume = parseInt(document.getElementById('minVolume').value, 10) || 0;
    const maxVolume = parseInt(document.getElementById('maxVolume').value, 10) || Infinity;
    resultado = resultado.filter(row => {
      const val = cleanNumber(row['Search Volume (Average)']);
      return val >= minVolume && val <= maxVolume;
    });
  }

  if (document.getElementById('filtroDuplicados')?.checked) {
    console.log('Filtro duplicados activo. Filas entrada:', resultado.length);
    const keywordsNorm = resultado.map(row => normalizaDuplicado(row['Keywords']));
    console.log('Keywords normalizados:', keywordsNorm);
    const uniques = new Set(keywordsNorm);
    console.log('Únicos:', uniques.size, 'Totales:', keywordsNorm.length);
    const itemsByKeyword = {};
    resultado.forEach(row => {
      // Normaliza y muestra el string clave
      const kNorm = normalizaDuplicado(row['Keywords']);
      console.log('Clave normalizada:', kNorm);
      const currVol = cleanNumber(row['Search Volume (Average)']);
      if (!itemsByKeyword[kNorm] || cleanNumber(itemsByKeyword[kNorm]['Search Volume (Average)']) < currVol) {
        itemsByKeyword[kNorm] = row;
      }
    });
    resultado = Object.values(itemsByKeyword);
    console.log('Claves normalizadas:', Object.keys(itemsByKeyword));
    console.log('Filas tras duplicados:', resultado.length);
  }

  if (document.getElementById('filtroExcluir')?.checked) {
    const excludeRaw = document.getElementById('excludeWordsInput').value;
    if (excludeRaw.trim()) {
      const words = excludeRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      resultado = resultado.filter(row => {
        const keyword = row['Keywords'].toLowerCase();
        return !words.some(w => keyword.includes(w));
      });
    }
  }

  if (document.getElementById('filtroIncluir')?.checked) {
    const incluirRaw = document.getElementById('incluirWordsInput').value;
    if (incluirRaw.trim()) {
      const words = incluirRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      resultado = resultado.filter(row => {
        const keyword = row['Keywords'].toLowerCase();
        return words.some(w => keyword.includes(w));
      });
    }
  }

  if (document.getElementById('filtroNumPalabras')?.checked) {
    const numPalabrasDeseado = parseInt(document.getElementById('numPalabrasInput').value, 10);
    if (!isNaN(numPalabrasDeseado) && numPalabrasDeseado > 0) {
      resultado = resultado.filter(row => {
        const palabras = row['Keywords'].normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().split(/\s+/);
        return palabras.length === numPalabrasDeseado;
      });
    }
  }

  // ----- Filtros de resumen/rangos SOLO si están activos -----
  if (filtroResumenVolume) {
    const rango = rangosVolume.find(r => r.label === filtroResumenVolume);
    if (rango) {
      resultado = resultado.filter(row => {
        const v = cleanNumber(row["Search Volume (Average)"]);
        return v >= rango.min && v <= rango.max;
      });
    }
  }

  if (filtroResumenCompetition) {
    const rango = rangosCompetition.find(r => r.label === filtroResumenCompetition);
    if (rango) {
      resultado = resultado.filter(row => {
        let v = Number(row["Competition"]);
        v = isNaN(v) ? 0 : v;
        return v >= rango.min && v <= rango.max;
      });
    }
  }

  if (filtroResumenCPC) {
    const rango = bloquesCPC.find(r => r.label === filtroResumenCPC);
    if (rango) {
      resultado = resultado.filter(row => {
        let cpcStr = String(row["Average CPC (EUR)"]).replace(",", ".");
        let v = parseFloat(cpcStr);
        v = isNaN(v) ? 0 : v;
        return v >= rango.min && v < rango.max;
      });
    }
  }

  // Filtro de pico de tráfico - ponlo justo después de los otros filtros generales
  const monthColumns = Object.keys(resultado[0]).filter(key => /Search Volume \(([a-zA-Z]{3}) (\d{4})\)/.test(key));
  const filtroPico = document.getElementById('selectFiltroPico')?.value;

  if (filtroPico === 'solo-pico') {
      resultado = resultado.filter(row => tieneUnicoPico(row, monthColumns));
  } else if (filtroPico === 'sin-pico') {
      resultado = resultado.filter(row => !tieneUnicoPico(row, monthColumns));
  }// Si es 'todos', no se filtra por picos

    // ----- Ordenación por meses -----  
    const mesSeleccionado = document.getElementById('selectMes').value;
    if (mesSeleccionado) {
      resultado.sort((a, b) => cleanNumber(b[mesSeleccionado]) - cleanNumber(a[mesSeleccionado]));
    }

    // ---- Actualiza y pinta ----
    filteredData = resultado;
    showSummaryAndTable();
  }


// ---------- BLOQUE 5: RESUMEN, TABLA Y EVENTOS ----------

function showSummaryAndTable() {
  const dataToShow = filteredData.length ? filteredData : excelData;
  if (!dataToShow || !dataToShow.length) return;
  
  const mesesRegex = /\(([a-zA-Z]{3})\s\d{4}\)/i;
  const monthColumns = Object.keys(dataToShow[0]).filter(key => mesesRegex.test(key));

  // Calcula frecuencias para los resúmenes de cada rango
  const freqRangosVolume = {};
  dataToShow.forEach(row => {
    const v = cleanNumber(row["Search Volume (Average)"]);
    const grupo = rangosVolume.find(r => v >= r.min && v <= r.max);
    const label = grupo ? grupo.label : "Otro";
    freqRangosVolume[label] = (freqRangosVolume[label] || 0) + 1;
  });

  const freqRangosCompetition = {};
  dataToShow.forEach(row => {
    let v = Number(row["Competition"]);
    v = isNaN(v) ? 0 : v;
    const grupo = rangosCompetition.find(r => v >= r.min && v <= r.max);
    const label = grupo ? grupo.label : "Otro";
    freqRangosCompetition[label] = (freqRangosCompetition[label] || 0) + 1;
  });

  const freqBloquesCPC = {};
  dataToShow.forEach(row => {
    let cpcStr = String(row["Average CPC (EUR)"]).replace(",", ".");
    let v = parseFloat(cpcStr);
    v = isNaN(v) ? 0 : v;
    const grupo = bloquesCPC.find(r => v >= r.min && v < r.max);
    const label = grupo ? grupo.label : ">1.0";
    freqBloquesCPC[label] = (freqBloquesCPC[label] || 0) + 1;
  });

  // Ordena los resúmenes por valor
  const volumenRangosOrder = rangosVolume
    .map(r => ({ ...r, count: freqRangosVolume[r.label] || 0 }))
    .sort((a, b) => a.min - b.min);
  const competitionRangosOrder = rangosCompetition
    .map(r => ({ ...r, count: freqRangosCompetition[r.label] || 0 }))
    .sort((a, b) => a.min - b.min);
  const cpcRangosOrder = bloquesCPC
    .map(r => ({ ...r, count: freqBloquesCPC[r.label] || 0 }))
    .sort((a, b) => a.min - b.min);

  // Genera resúmenes con enlaces
  let resumenHtml = `<strong>Frecuencia Search Volume (Average):</strong><br>`;
  volumenRangosOrder.forEach(({label, count}) => {
      if (count > 0) {
          resumenHtml += `<a href="#" class="filtroVolume" data-label="${label}">${label}: <b>${count}</b></a><br>`;
      }
  }); 

  let resumenCompHtml = `<strong>Rangos Competition:</strong><br>`;
  competitionRangosOrder.forEach(({label, count}) => {
      if (count > 0) {
          resumenCompHtml += `<a href="#" class="filtroCompetition" data-label="${label}">${label}: <b>${count}</b></a><br>`;
      }
  }); 

  let resumenCPCHtml = `<strong>Average CPC (EUR):</strong><br>`;
  cpcRangosOrder.forEach(({label, count}) => {
      if (count > 0) {
          resumenCPCHtml += `<a href="#" class="filtroCPC" data-label="${label}">${label}: <b>${count}</b></a><br>`;
      }
  });

  const totalRows = dataToShow.length;
  // Prepara la línea con los filtros activos
  let filtrosActivos = [];
  if (document.getElementById('filtroVolumen')?.checked)     filtrosActivos.push("volumen");
  if (document.getElementById('filtroDuplicados')?.checked)  filtrosActivos.push("duplicados");
  if (document.getElementById('filtroExcluir')?.checked)     filtrosActivos.push("palabras excluidas");
  if (document.getElementById('filtroIncluir')?.checked)     filtrosActivos.push("inclusión de palabras");
  if (document.getElementById('filtroNumPalabras')?.checked) filtrosActivos.push("número de palabras");
  if (filtroResumenVolume)     filtrosActivos.push(`Volume (${filtroResumenVolume})`);
  if (filtroResumenCompetition)filtrosActivos.push(`Competition (${filtroResumenCompetition})`);
  if (filtroResumenCPC)        filtrosActivos.push(`CPC (${filtroResumenCPC})`);

  let htmlResumen = `
      <div>
        <button id="btnResetResumen">Resetear resumen</button>
        <p><strong>Resumen inicial:</strong></p>
        <p>Filas cargadas: ${totalRows}</p>
        ${filtrosActivos.length ? `<br><strong>Filtros activos:</strong> ${filtrosActivos.join(', ')}` : ''}
      </div>
      <div>${resumenHtml}</div>
      <div>${resumenCompHtml}</div>
      <div>${resumenCPCHtml}</div>
  `;
  document.getElementById('summary').innerHTML = htmlResumen;

  // ---- Genera la tabla de datos ----
  let html = "<table><thead><tr>";
  Object.keys(dataToShow[0]).forEach(key => {
    html += `<th>${key}</th>`;
  });
  html += "</tr></thead><tbody>";

  dataToShow.forEach(row => {
    // Saca los valores de meses de esta fila
    const valoresFila = monthColumns.map(k => cleanNumber(row[k]));
    const min = Math.min(...valoresFila.filter(v => !isNaN(v)));
    const max = Math.max(...valoresFila.filter(v => !isNaN(v)));
    const rango = max === min ? 1 : max - min;

    let htmlRow = "<tr>";
    Object.keys(row).forEach(key => {
      let style = "";
      if (monthColumns.includes(key)) {
        const value = cleanNumber(row[key]);
        // Normaliza p [0,1] respecto a min y max DE ESA FILA
        let p = (value - min) / rango;
        // Gradiente verde-amarillo-rojo
        let r, g, b = 0;
        if (p <= 0.5) {
          // verde a amarillo: #00ff00 -> #ffff00
          r = Math.round(2 * p * 255);
          g = 255;
        } else {
          // amarillo a rojo: #ffff00 -> #ff0000
          r = 255;
          g = Math.round(2 * (1 - p) * 255);
        }
        style = `background:rgb(${r},${g},0);`;
      }
      // SOLO para la celda de 'Keywords':
      if (key === 'Keywords') {
        htmlRow += `<td class="cell-keyword" data-keyword="${row[key]}">${row[key]}</td>`;
      } else {
        htmlRow += `<td style="${style}">${row[key]}</td>`;
      }
    });
    htmlRow += "</tr>";
    html += htmlRow;
  });

  html += "</tbody></table>";
  document.getElementById('table').innerHTML = html;

  // Listener para gráfica de keywords
  setTimeout(() => {
    document.querySelectorAll('.cell-keyword').forEach(cell => {
      cell.onclick = function() {
        const keyword = cell.getAttribute('data-keyword');
        console.log('[CLICK] sobre keyword:', keyword);
        mostrarGraficaKeyword(keyword);
      };
    });
  }, 50);

  // ---- Listeners para filtros de resumen ----
  setTimeout(() => {
    // Enlaces de resumen/rango
    document.querySelectorAll('.filtroVolume').forEach(el => {
      el.onclick = function(e) {
        e.preventDefault();
        filtroResumenVolume = this.getAttribute('data-label');
        aplicarFiltrosMultiplesYResumen(); // Llama al filtrado central, nunca filtres aquí directamente
      };
    });

    document.querySelectorAll('.filtroCompetition').forEach(el => {
      el.onclick = function(e) {
        e.preventDefault();
        filtroResumenCompetition = this.getAttribute('data-label');
        aplicarFiltrosMultiplesYResumen();
      };
    });

    document.querySelectorAll('.filtroCPC').forEach(el => {
      el.onclick = function(e) {
        e.preventDefault();
        filtroResumenCPC = this.getAttribute('data-label');
        aplicarFiltrosMultiplesYResumen();
      };
    });

    // Reset solo limpia los filtros de resumen, no borra todo el filtrado general
    const btnReset = document.getElementById('btnResetResumen');
    if (btnReset) {
      btnReset.onclick = function() {
        filtroResumenVolume = null;
        filtroResumenCompetition = null;
        filtroResumenCPC = null;
        aplicarFiltrosMultiplesYResumen();
      };
    }
  }, 50);
}

document.getElementById('btnExportExcel').addEventListener('click', function() {
    // Usamos los datos actuales mostrados
    // filteredData SI hay filtros, excelData si no
    const datosExport = filteredData.length ? filteredData : excelData;
    if (!datosExport.length) return;

    // Crea una hoja JS
    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");

    // Exporta el archivo
    XLSX.writeFile(wb, "datos-filtrados.xlsx", { compression: true });
});

// ---------- Pop-up gráfica
  function cerrarPopup() {
    document.getElementById('popupGrafica').style.display = 'none';
    document.getElementById('graficaContainer').innerHTML = '';
  }

  function mostrarGraficaKeyword(keyword) {
    console.log('ENTRANDO EN mostrarGraficaKeyword para:', keyword);

    const dataToShow = filteredData.length ? filteredData : excelData;
    const obj = dataToShow.find(row => row["Keywords"] === keyword);
    console.log('Objeto de fila encontrado:', obj);

    if (!obj) {
      console.warn('No se encontró keyword en los datos:', keyword);
      return;
    }

    // Saca valores de mes
    const mesesRegex = /Search Volume \(([a-zA-Z]{3}) (\d{4})\)/;
    const monthColumns = Object.keys(obj).filter(key => mesesRegex.test(key));
    console.log('Columnas de meses:', monthColumns);

    // Tras ordenar columnas
    console.log('Meses ordenados:', monthColumns);

    // Prepara datos para la gráfica
    const labels = [], values = [];
    monthColumns.forEach(key => {
      labels.push(key.replace("Search Volume ",""));
      values.push(cleanNumber(obj[key]));
    });

    console.log('Labels:', labels, 'Values:', values);

    document.getElementById('popupGrafica').style.display = 'block';
    document.getElementById('graficaContainer').innerHTML = '<canvas id="graficoKeyword"></canvas>';
    console.log('Mostrando div gráfico, canvas creado');

    // Crea la gráfica
    try {
      new Chart(document.getElementById('graficoKeyword').getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: keyword,
            data: values,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)'
          }]
        },
        options: {
          responsive:true,
          plugins:{ legend:{display:false} },
          scales:{ y:{ beginAtZero:true } }
        }
      });
      console.log('Gráfica Chart.js generada correctamente');
    } catch (err) {
      console.error('ERROR CREATING CHART:', err);
    }
  }

// --------- Botón de información
document.getElementById('btnInfoApp').onclick = function() {
  document.getElementById('popupInfoApp').style.display = 'block';
};
function cerrarInfoApp() {
  document.getElementById('popupInfoApp').style.display = 'none';
}




// ---------- BLOQUE 6: CONEXIÓN DE LISTENERS Y EVENTOS PRINCIPALES ----------

// Conexión al input file (puede ir donde definas el HTML, tras cargar utilidades)
document.getElementById('fileInput').addEventListener('change', handleFile);

// Listeners de filtros generales
document.getElementById('filtroVolumen')?.addEventListener('change', aplicarFiltrosMultiplesYResumen);
document.getElementById('minVolume')?.addEventListener('input', aplicarFiltrosMultiplesYResumen);
document.getElementById('maxVolume')?.addEventListener('input', aplicarFiltrosMultiplesYResumen);

document.getElementById('filtroDuplicados').addEventListener('change', aplicarFiltrosMultiplesYResumen);

document.getElementById('filtroExcluir')?.addEventListener('change', aplicarFiltrosMultiplesYResumen);
document.getElementById('excludeWordsInput')?.addEventListener('input', aplicarFiltrosMultiplesYResumen);

document.getElementById('filtroIncluir')?.addEventListener('change', aplicarFiltrosMultiplesYResumen);
document.getElementById('incluirWordsInput')?.addEventListener('input', aplicarFiltrosMultiplesYResumen);

document.getElementById('filtroNumPalabras')?.addEventListener('change', aplicarFiltrosMultiplesYResumen);
document.getElementById('numPalabrasInput')?.addEventListener('input', aplicarFiltrosMultiplesYResumen);

document.getElementById('selectMes').addEventListener('change', aplicarFiltrosMultiplesYResumen);

document.getElementById('selectFiltroPico').addEventListener('change', aplicarFiltrosMultiplesYResumen);

});

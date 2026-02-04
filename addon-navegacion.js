// ============================================================================
// ADDON: Navegacion entre modos y Search Console
// ============================================================================

// Funciones globales para cerrar popups
function cerrarPopup() {
  document.getElementById('popupGrafica').style.display = 'none';
  // Limpiar solo el contenido del canvas, preservando el botón de cerrar
  const container = document.getElementById('graficaContainer');
  const canvas = container.querySelector('canvas');
  if (canvas) {
    canvas.remove();
  }
}

function cerrarInfoApp() {
  document.getElementById('popupInfoApp').style.display = 'none';
}

function abrirInfoApp() {
  document.getElementById('popupInfoApp').style.display = 'block';
}

// Event listeners para navegacion
document.addEventListener("DOMContentLoaded", function() {
  
  // Listener para botón de cerrar gráfica
  const btnCerrarGrafica = document.getElementById('btnCerrarGrafica');
  if (btnCerrarGrafica) {
    btnCerrarGrafica.addEventListener('click', cerrarPopup);
  }
  
  // Click en el fondo oscuro del popup para cerrar
  const popupGrafica = document.getElementById('popupGrafica');
  if (popupGrafica) {
    popupGrafica.addEventListener('click', function(e) {
      // Solo cerrar si se hace click en el fondo, no en el contenido
      if (e.target.id === 'popupGrafica') {
        cerrarPopup();
      }
    });
  }
  
  // Listener para botón de información
  const btnInfoApp = document.getElementById('btnInfoApp');
  if (btnInfoApp) {
    btnInfoApp.addEventListener('click', abrirInfoApp);
  }
  
  // Click fuera del popup para cerrar
  const popupInfoApp = document.getElementById('popupInfoApp');
  if (popupInfoApp) {
    popupInfoApp.addEventListener('click', function(e) {
      if (e.target.id === 'popupInfoApp') {
        cerrarInfoApp();
      }
    });
  }
  
  const btnUnArchivo = document.getElementById('btnModoUnArchivo');
  const btnMultiples = document.getElementById('btnModoMultiplesArchivos');
  const btnSearchConsole = document.getElementById('btnModoSearchConsole');
  
  console.log('Addon navegacion cargado');
  console.log('Botones:', btnUnArchivo, btnMultiples, btnSearchConsole);
  
  if (btnUnArchivo) {
    btnUnArchivo.addEventListener('click', function() {
      console.log('Click en Un Archivo');
      document.getElementById('sectionUnArchivo').style.display = 'block';
      document.getElementById('sectionMultiplesArchivos').style.display = 'none';
      if (document.getElementById('sectionSearchConsole')) {
        document.getElementById('sectionSearchConsole').style.display = 'none';
      }
    });
  }
  
  if (btnMultiples) {
    btnMultiples.addEventListener('click', function() {
      console.log('Click en Multiples Archivos');
      document.getElementById('sectionUnArchivo').style.display = 'none';
      document.getElementById('sectionMultiplesArchivos').style.display = 'block';
      if (document.getElementById('sectionSearchConsole')) {
        document.getElementById('sectionSearchConsole').style.display = 'none';
      }
    });
  }
  
  if (btnSearchConsole) {
    btnSearchConsole.addEventListener('click', function() {
      console.log('Click en Search Console');
      document.getElementById('sectionUnArchivo').style.display = 'none';
      document.getElementById('sectionMultiplesArchivos').style.display = 'none';
      document.getElementById('sectionSearchConsole').style.display = 'block';
    });
  }
  
  // ============================================================================
  // FUNCIONALIDAD SEARCH CONSOLE
  // ============================================================================
  
  let scKeywordsData = null;
  let scConsoleData = null;
  
  const scKeywordsFile = document.getElementById('scKeywordsFile');
  if (scKeywordsFile) {
    scKeywordsFile.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          const firstSheet = workbook.SheetNames[0];
          scKeywordsData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          alert('✅ Keywords cargadas: ' + scKeywordsData.length + ' filas');
        } catch (error) {
          alert('❌ Error al cargar keywords');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  
  const scConsoleFile = document.getElementById('scConsoleFile');
  if (scConsoleFile) {
    scConsoleFile.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          let sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('consulta') || 
            name.toLowerCase().includes('query')
          );
          if (!sheetName) sheetName = workbook.SheetNames[0];
          scConsoleData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          alert('✅ Search Console cargado: ' + scConsoleData.length + ' filas (Hoja: ' + sheetName + ')');
        } catch (error) {
          alert('❌ Error al cargar Search Console');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  
  const btnCombinar = document.getElementById('btnCombinarSC');
  if (btnCombinar) {
    btnCombinar.addEventListener('click', function() {
      if (!scKeywordsData || !scConsoleData) {
        alert('⚠️ Por favor carga ambos archivos primero');
        return;
      }
      const onlyMatches = document.getElementById('scOnlyMatches').checked;
      const combinedData = [];
      const scFirstRow = scConsoleData[0];
      const queryColumnSC = Object.keys(scFirstRow).find(k => 
        k.toLowerCase().includes('query') || 
        k.toLowerCase().includes('consulta') ||
        k.toLowerCase().includes('keyword')
      );
      if (!queryColumnSC) {
        alert('❌ No se encontró columna de queries en Search Console');
        return;
      }
      const scMap = {};
      scConsoleData.forEach(row => {
        const query = row[queryColumnSC];
        if (query) {
          scMap[String(query).toLowerCase().trim()] = row;
        }
      });
      const kwFirstRow = scKeywordsData[0];
      const keywordColumnKW = Object.keys(kwFirstRow).find(k =>
        k.toLowerCase().includes('keyword')
      );
      if (!keywordColumnKW) {
        alert('❌ No se encontró columna de keywords');
        return;
      }
      let matchCount = 0;
      scKeywordsData.forEach(kwRow => {
        const keyword = kwRow[keywordColumnKW];
        if (!keyword) return;
        const keywordNorm = String(keyword).toLowerCase().trim();
        const scData = scMap[keywordNorm];
        if (onlyMatches && !scData) return;
        const combined = Object.assign({}, kwRow);
        if (scData) {
          matchCount++;
          Object.keys(scData).forEach(key => {
            if (key === queryColumnSC) return;
            const keyLower = key.toLowerCase();
            if (keyLower.includes('clic')) combined['SC_Clicks'] = scData[key];
            else if (keyLower.includes('impresion')) combined['SC_Impressions'] = scData[key];
            else if (keyLower.includes('ctr')) combined['SC_CTR'] = scData[key];
            else if (keyLower.includes('posicion')) combined['SC_Position'] = scData[key];
          });
        } else {
          combined['SC_Clicks'] = '-';
          combined['SC_Impressions'] = '-';
          combined['SC_CTR'] = '-';
          combined['SC_Position'] = '-';
        }
        combinedData.push(combined);
      });
      if (combinedData.length === 0) {
        alert('⚠️ No se encontraron coincidencias');
        return;
      }
      const container = document.getElementById('scResults');
      container.style.display = 'block';
      const keys = Object.keys(combinedData[0]);
      let html = '<div style="margin-bottom: 15px; padding: 12px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px;">';
      html += '<strong>✅ ' + matchCount + ' keywords con datos de Search Console</strong>';
      html += '<span style="margin-left: 20px; color: #6b7280;">Total: ' + combinedData.length + '</span></div>';
      html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;"><thead><tr>';
      keys.forEach(key => {
        const isSC = key.startsWith('SC_');
        const bgColor = isSC ? 'background: #10b981;' : 'background: #667eea;';
        html += '<th style="' + bgColor + ' color: white; padding: 12px; font-size: 13px; white-space: nowrap;">' + key + '</th>';
      });
      html += '</tr></thead><tbody>';
      combinedData.forEach(row => {
        html += '<tr>';
        keys.forEach(key => {
          const value = row[key] || '-';
          const isMatch = key.startsWith('SC_') && value !== '-';
          const bgColor = isMatch ? 'background-color: #f0fdf4;' : '';
          html += '<td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-size: 13px; ' + bgColor + '">' + value + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      document.getElementById('scTable').innerHTML = html;
      document.getElementById('btnExportSC').onclick = function() {
        const ws = XLSX.utils.json_to_sheet(combinedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Combined Data');
        XLSX.writeFile(wb, 'keywords_search_console_combined.xlsx');
      };
      alert('✅ Archivos combinados: ' + combinedData.length + ' resultados\n🎯 Coincidencias: ' + matchCount);
    });
  }
  
});

// ============================================================================
// FUNCIONALIDAD DE AGRUPACION DE KEYWORDS
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
  
  // Detectar cuando se activa la agrupación
  const filtroAgrupar = document.getElementById('filtroAgrupar');
  if (filtroAgrupar) {
    filtroAgrupar.addEventListener('change', function() {
      // Esto será manejado por el script principal
      console.log('Agrupación activada:', this.checked);
    });
  }
  
});

function agruparYMostrarKeywords(data, inputId) {
  const agruparInput = document.getElementById(inputId || 'agruparInput');
  if (!agruparInput || !agruparInput.value.trim()) {
    return null;
  }
  
  const terminos = agruparInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  if (terminos.length === 0) {
    return null;
  }
  
  // Crear grupos
  const grupos = {};
  terminos.forEach(termino => {
    grupos[termino] = [];
  });
  grupos['otros'] = []; // Grupo para keywords que no coinciden
  
  // Clasificar keywords
  data.forEach(row => {
    const keyword = row['Keywords'] ? row['Keywords'].toLowerCase() : '';
    let asignado = false;
    
    for (let termino of terminos) {
      if (keyword.includes(termino)) {
        grupos[termino].push(row);
        asignado = true;
        break; // Solo asignar a un grupo
      }
    }
    
    if (!asignado) {
      grupos['otros'].push(row);
    }
  });
  
  return { grupos, terminos };
}

function generarHTMLGrupos(gruposData, columnas) {
  if (!gruposData) return null;
  
  const { grupos, terminos } = gruposData;
  let html = '<div class="grupos-container">';
  
  // Generar acordeón para cada grupo
  [...terminos, 'otros'].forEach(termino => {
    const items = grupos[termino];
    if (!items || items.length === 0) return;
    
    const grupoId = 'grupo-' + termino.replace(/\s+/g, '-');
    const count = items.length;
    
    html += `
      <div class="grupo-accordion">
        <div class="grupo-header" data-grupo="${grupoId}">
          <span class="grupo-toggle">▶</span>
          <span class="grupo-title">${termino.toUpperCase()} (${count} keywords)</span>
          <button class="btn-export-group" data-grupo="${termino}" title="Exportar este grupo">
            📥 Exportar
          </button>
        </div>
        <div class="grupo-content" id="${grupoId}" style="display: none;">
          <table>
            <thead><tr>
              <th style="width: 40px;"><input type="checkbox" class="select-all-group" data-grupo="${termino}" style="width: 18px; height: 18px; cursor: pointer;"></th>
              ${columnas.map(col => `<th>${col}</th>`).join('')}
            </tr></thead>
            <tbody>
    `;
    
    // Detectar columnas de meses (mismo regex que script.js)
    const mesesRegex = /\(([a-zA-Z]{3})\s\d{4}\)/i;
    const monthColumns = columnas.filter(k => mesesRegex.test(k));
    
    items.forEach((row) => {
      // Calcular min/max para mapa de calor de esta fila
      const valoresFila = monthColumns.map(k => {
        const val = row[k];
        if (val == null || val === "") return 0;
        let s = String(val).replace(/,/g, "");
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      });
      const min = Math.min(...valoresFila.filter(v => !isNaN(v)));
      const max = Math.max(...valoresFila.filter(v => !isNaN(v)));
      const rango = max === min ? 1 : max - min;
      
      html += '<tr>';
      html += `<td style="text-align: center;"><input type="checkbox" class="keyword-checkbox" data-keyword="${row['Keywords']}" style="width: 18px; height: 18px; cursor: pointer;"></td>`;
      
      columnas.forEach(key => {
        let style = "";
        
        // Aplicar mapa de calor a columnas de meses
        if (monthColumns.includes(key)) {
          const value = row[key];
          let numValue = 0;
          if (value != null && value !== "") {
            let s = String(value).replace(/,/g, "");
            const n = parseFloat(s);
            numValue = isNaN(n) ? 0 : n;
          }
          
          let p = (numValue - min) / rango;
          let r, g, b = 0;
          if (p <= 0.5) {
            r = Math.round(2 * p * 255);
            g = 255;
          } else {
            r = 255;
            g = Math.round(2 * (1 - p) * 255);
          }
          style = `background:rgb(${r},${g},0);`;
        }
        
        if (key === 'Keywords') {
          const keywordEncoded = encodeURIComponent(row[key]);
          const googleUrl = `https://www.google.com/search?q=${keywordEncoded}`;
          html += `<td style="display: flex; align-items: center; gap: 8px; padding: 8px;">
            <a href="${googleUrl}" target="_blank" style="color: #667eea; text-decoration: none; flex: 1;" title="Buscar en Google">
              ${row[key]}
            </a>
            <button class="btn-chart" data-keyword="${row[key]}" title="Ver evolución" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; transition: transform 0.2s;">
              📈
            </button>
          </td>`;
        } else {
          html += `<td style="${style}">${row[key]}</td>`;
        }
      });
      
      html += '</tr>';
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Hacer funciones globales
window.agruparYMostrarKeywords = agruparYMostrarKeywords;
window.generarHTMLGrupos = generarHTMLGrupos;

function exportarGrupo(nombreGrupo, datos) {
  if (!datos || datos.length === 0) {
    alert('No hay datos en este grupo');
    return;
  }
  
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreGrupo);
  
  const filename = `grupo-${nombreGrupo.replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(wb, filename, { compression: true });
}

window.exportarGrupo = exportarGrupo;

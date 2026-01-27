// ============================================================================
// ADDON: Navegacion entre modos y Search Console
// ============================================================================

// Funciones globales para cerrar popups
function cerrarPopup() {
  document.getElementById('popupGrafica').style.display = 'none';
  document.getElementById('graficaContainer').innerHTML = '';
}

function cerrarInfoApp() {
  document.getElementById('popupInfoApp').style.display = 'none';
}

// Event listeners para navegacion
document.addEventListener("DOMContentLoaded", function() {
  
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

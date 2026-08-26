/**
 * ضع هذا الكود بالكامل في Google Apps Script أسفل دالة setupDatabaseSheets التي قمت بإنشائها مسبقاً.
 * بعد ذلك اذهب إلى: Deploy -> New deployment -> Web app
 * واجعل "Who has access" = "Anyone" (لكي يتمكن التطبيق من الاتصال بدون تسجيل الدخول بحساب جوجل).
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const responseData = {};

  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    // Ignore default sheets if any
    if (sheetName === 'Sheet1' || sheetName === 'ورقة 1') return;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      responseData[sheetName] = [];
      return;
    }

    const headers = data[0];
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowObj = {};
      for (let j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = data[i][j];
      }
      rows.push(rowObj);
    }
    
    responseData[sheetName] = rows;
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true, data: responseData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'INSERT') {
      const { table, data } = body;
      const sheet = ss.getSheetByName(table);
      if (!sheet) throw new Error("Table not found: " + table);
      
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Handle array of objects or single object
      const rowsToInsert = Array.isArray(data) ? data : [data];
      const newRows = [];
      
      rowsToInsert.forEach(obj => {
        const rowData = headers.map(header => obj[header] !== undefined ? obj[header] : "");
        newRows.push(rowData);
      });
      
      // Insert in batch
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'UPDATE') {
      const { table, id, data } = body;
      const sheet = ss.getSheetByName(table);
      if (!sheet) throw new Error("Table not found: " + table);
      
      const sheetData = sheet.getDataRange().getValues();
      const headers = sheetData[0];
      const idIndex = headers.indexOf('id');
      
      if (idIndex === -1) throw new Error("No id column found in " + table);
      
      let targetRowIndex = -1;
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][idIndex] == id) {
          targetRowIndex = i + 1; // 1-based indexing for Apps Script
          break;
        }
      }
      
      if (targetRowIndex === -1) throw new Error("Row with id " + id + " not found");
      
      // Update specific columns
      for (const key in data) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(targetRowIndex, colIndex + 1).setValue(data[key]);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'DELETE') {
      const { table, id } = body;
      const sheet = ss.getSheetByName(table);
      if (!sheet) throw new Error("Table not found: " + table);
      
      const sheetData = sheet.getDataRange().getValues();
      const headers = sheetData[0];
      const idIndex = headers.indexOf('id');
      
      if (idIndex === -1) throw new Error("No id column found in " + table);
      
      let targetRowIndex = -1;
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][idIndex] == id) {
          targetRowIndex = i + 1;
          break;
        }
      }
      
      if (targetRowIndex === -1) throw new Error("Row with id " + id + " not found");
      
      sheet.deleteRow(targetRowIndex);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'RPC_PROCESS_SALE') {
      // Custom logic to handle transactional atomic sales
      const { sale, items, payment, inventoryMovements } = body.data;
      
      insertRow(ss, 'Sales', sale);
      if (items && items.length > 0) insertRows(ss, 'Sale_Items', items);
      if (payment) insertRow(ss, 'Payments', payment);
      
      if (inventoryMovements && inventoryMovements.length > 0) {
        insertRows(ss, 'Inventory_Movements', inventoryMovements);
        
        const prodSheet = ss.getSheetByName('Products');
        const prodData = prodSheet.getDataRange().getValues();
        const headers = prodData[0];
        const idCol = headers.indexOf('id');
        const stockCol = headers.indexOf('current_stock');
        
        inventoryMovements.forEach(movement => {
           if(movement.movement_type === 'OUT') {
             for(let r = 1; r < prodData.length; r++) {
               if(prodData[r][idCol] == movement.product_id) {
                 const newStock = Math.max(0, Number(prodData[r][stockCol]) - Number(movement.quantity));
                 prodSheet.getRange(r + 1, stockCol + 1).setValue(newStock);
                 prodData[r][stockCol] = newStock;
                 break;
               }
             }
           }
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'RPC_CANCEL_SALE') {
      const { saleId, reason, inventoryMovements } = body.data;
      
      // Update Sale Status
      const salesSheet = ss.getSheetByName('Sales');
      const salesData = salesSheet.getDataRange().getValues();
      const salesHeaders = salesData[0];
      const salesIdCol = salesHeaders.indexOf('id');
      const statusCol = salesHeaders.indexOf('status');
      const notesCol = salesHeaders.indexOf('notes');
      
      for (let r = 1; r < salesData.length; r++) {
        if (salesData[r][salesIdCol] == saleId) {
          salesSheet.getRange(r + 1, statusCol + 1).setValue('CANCELLED');
          salesSheet.getRange(r + 1, notesCol + 1).setValue(salesData[r][notesCol] + '\n' + reason);
          break;
        }
      }
      
      // Insert return movements and update stock
      if (inventoryMovements && inventoryMovements.length > 0) {
        insertRows(ss, 'Inventory_Movements', inventoryMovements);
        
        const prodSheet = ss.getSheetByName('Products');
        const prodData = prodSheet.getDataRange().getValues();
        const headers = prodData[0];
        const idCol = headers.indexOf('id');
        const stockCol = headers.indexOf('current_stock');
        
        inventoryMovements.forEach(movement => {
           if(movement.movement_type === 'RETURN') {
             for(let r = 1; r < prodData.length; r++) {
               if(prodData[r][idCol] == movement.product_id) {
                 const newStock = Number(prodData[r][stockCol]) + Number(movement.quantity);
                 prodSheet.getRange(r + 1, stockCol + 1).setValue(newStock);
                 prodData[r][stockCol] = newStock;
                 break;
               }
             }
           }
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    throw new Error("Unknown action: " + action);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function insertRow(ss, tableName, obj) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(header => obj[header] !== undefined ? obj[header] : "");
  sheet.appendRow(rowData);
}

function insertRows(ss, tableName, arr) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet || arr.length === 0) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = arr.map(obj => headers.map(header => obj[header] !== undefined ? obj[header] : ""));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

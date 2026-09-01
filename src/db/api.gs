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

      // Update Vehicle Stats
      if (sale.vehicle_id) {
        const vehiclesSheet = ss.getSheetByName('Vehicles');
        if (vehiclesSheet) {
          const vehiclesData = vehiclesSheet.getDataRange().getValues();
          const vHeaders = vehiclesData[0];
          const vIdCol = vHeaders.indexOf('id');
          const vVisitsCol = vHeaders.indexOf('visits_count');
          const vSpentCol = vHeaders.indexOf('total_spent');
          const vLastVisitCol = vHeaders.indexOf('last_visit_at');
          const vUpdatedCol = vHeaders.indexOf('updated_at');
          
          for (let r = 1; r < vehiclesData.length; r++) {
            if (vehiclesData[r][vIdCol] == sale.vehicle_id) {
              if (vVisitsCol !== -1) {
                const newVisits = Number(vehiclesData[r][vVisitsCol] || 0) + 1;
                vehiclesSheet.getRange(r + 1, vVisitsCol + 1).setValue(newVisits);
              }
              if (vSpentCol !== -1) {
                const newSpent = Number(vehiclesData[r][vSpentCol] || 0) + Number(sale.total || 0);
                vehiclesSheet.getRange(r + 1, vSpentCol + 1).setValue(newSpent);
              }
              if (vLastVisitCol !== -1) {
                vehiclesSheet.getRange(r + 1, vLastVisitCol + 1).setValue(sale.created_at);
              }
              if (vUpdatedCol !== -1) {
                vehiclesSheet.getRange(r + 1, vUpdatedCol + 1).setValue(new Date().toISOString());
              }
              break;
            }
          }
        }
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
      const sVehicleCol = salesHeaders.indexOf('vehicle_id');
      const sTotalCol = salesHeaders.indexOf('total');
      
      let targetVehicleId = null;
      let targetSaleTotal = 0;
      
      for (let r = 1; r < salesData.length; r++) {
        if (salesData[r][salesIdCol] == saleId) {
          salesSheet.getRange(r + 1, statusCol + 1).setValue('CANCELLED');
          salesSheet.getRange(r + 1, notesCol + 1).setValue(salesData[r][notesCol] + '\n' + reason);
          if (sVehicleCol !== -1) targetVehicleId = salesData[r][sVehicleCol];
          if (sTotalCol !== -1) targetSaleTotal = Number(salesData[r][sTotalCol] || 0);
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
      
      // Revert Vehicle Stats
      if (targetVehicleId) {
        const vehiclesSheet = ss.getSheetByName('Vehicles');
        if (vehiclesSheet) {
          const vehiclesData = vehiclesSheet.getDataRange().getValues();
          const vHeaders = vehiclesData[0];
          const vIdCol = vHeaders.indexOf('id');
          const vVisitsCol = vHeaders.indexOf('visits_count');
          const vSpentCol = vHeaders.indexOf('total_spent');
          const vUpdatedCol = vHeaders.indexOf('updated_at');

          for (let r = 1; r < vehiclesData.length; r++) {
            if (vehiclesData[r][vIdCol] == targetVehicleId) {
              if (vVisitsCol !== -1) {
                const newVisits = Math.max(0, Number(vehiclesData[r][vVisitsCol] || 0) - 1);
                vehiclesSheet.getRange(r + 1, vVisitsCol + 1).setValue(newVisits);
              }
              if (vSpentCol !== -1) {
                const newSpent = Math.max(0, Number(vehiclesData[r][vSpentCol] || 0) - targetSaleTotal);
                vehiclesSheet.getRange(r + 1, vSpentCol + 1).setValue(newSpent);
              }
              if (vUpdatedCol !== -1) {
                vehiclesSheet.getRange(r + 1, vUpdatedCol + 1).setValue(new Date().toISOString());
              }
              break;
            }
          }
        }
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

// ============================================================================
// DATABASE SETUP & INITIALIZATION
// Run this function ONLY ONCE to create the database tables and columns
// ============================================================================

/**
 * هذا السكريبت يقوم بإنشاء جداول قاعدة بيانات V8 STANCE 
 * بدقة متناهية مع تنسيقات وقوائم منسدلة في Google Sheets.
 */
function setupDatabaseSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // تعريف الجداول والأعمدة بناءً على Schema التطبيق بدقة
  const tables = {
    'Profiles': ['id', 'full_name', 'role', 'phone', 'pin_code', 'is_active', 'created_at', 'updated_at'],
    'Vehicles': ['id', 'plate_letters', 'plate_numbers', 'plate_display', 'driver_name', 'phone', 'notes', 'visits_count', 'last_rewarded_visit_count', 'total_spent', 'last_visit_at', 'created_at', 'updated_at'],
    'Service_Categories': ['id', 'name', 'icon_name', 'description', 'is_active', 'created_at'],
    'Services': ['id', 'category_id', 'name', 'description', 'price', 'is_active', 'created_at', 'updated_at'],
    'Product_Categories': ['id', 'name', 'description', 'is_active'],
    'Products': ['id', 'name', 'sku', 'category_id', 'unit', 'purchase_price', 'selling_price', 'current_stock', 'minimum_stock', 'is_active', 'notes', 'created_at', 'updated_at'],
    'Sales': ['id', 'invoice_number', 'idempotency_key', 'vehicle_id', 'employee_id', 'subtotal', 'discount', 'total', 'payment_method', 'status', 'notes', 'created_at', 'updated_at'],
    'Sale_Items': ['id', 'sale_id', 'item_type', 'service_id', 'product_id', 'item_name_snapshot', 'quantity', 'unit_price', 'total'],
    'Payments': ['id', 'sale_id', 'amount', 'payment_method', 'created_by', 'created_at'],
    'Inventory_Movements': ['id', 'product_id', 'movement_type', 'quantity', 'unit_cost', 'reference_type', 'reference_id', 'notes', 'created_by', 'created_at'],
    'Expense_Categories': ['id', 'name', 'is_active'],
    'Expenses': ['id', 'category_id', 'amount', 'description', 'product_id', 'quantity', 'created_by', 'created_at']
  };

  // تعريف القوائم المنسدلة (Enums Data Validation)
  const validations = {
    'Profiles': { 'role': ['MANAGER', 'EMPLOYEE'] },
    'Products': { 'unit': ['قطعة', 'لتر', 'علبة'] },
    'Sales': { 
      'payment_method': ['CASH', 'WALLET'], 
      'status': ['COMPLETED', 'CANCELLED'] 
    },
    'Sale_Items': { 'item_type': ['SERVICE', 'PRODUCT'] },
    'Payments': { 'payment_method': ['CASH', 'WALLET'] },
    'Inventory_Movements': { 
      'movement_type': ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'],
      'reference_type': ['SALE', 'PURCHASE', 'ADJUSTMENT', 'SALE_CANCEL', 'EXPENSE']
    }
  };

  // المرور على الجداول لإنشائها
  for (const tableName in tables) {
    let sheet = ss.getSheetByName(tableName);
    
    // إذا لم يكن الشيت موجوداً، قم بإنشائه
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
    }
    
    const columns = tables[tableName];
    
    // وضع العناوين في الصف الأول
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    
    // تنسيق صف العناوين
    const headerRange = sheet.getRange(1, 1, 1, columns.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e293b'); // لون خلفية داكن (Slate-800)
    headerRange.setFontColor('#ffffff'); // خط أبيض
    headerRange.setHorizontalAlignment('center');
    
    // تجميد الصف الأول والعمود الأول (ID) لسهولة التصفح
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
    
    // تطبيق القوائم المنسدلة (Data Validation) على الأعمدة المطلوبة
    if (validations[tableName]) {
      const tableValidations = validations[tableName];
      for (const colName in tableValidations) {
        const colIndex = columns.indexOf(colName) + 1; // 1-based index
        if (colIndex > 0) {
          const rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(tableValidations[colName], true) // true = إظهار كسهم منسدل
            .setAllowInvalid(false) // منع إدخال قيم خارج القائمة
            .build();
          
          // تطبيقه مبدئياً على أول 1000 صف
          const validationRange = sheet.getRange(2, colIndex, 1000, 1);
          validationRange.setDataValidation(rule);
        }
      }
    }
    
    // تعديل عرض الأعمدة ليناسب المحتوى
    for (let i = 1; i <= columns.length; i++) {
      if (columns[i-1].includes('id')) {
        sheet.setColumnWidth(i, 220); // أعمدة الـ ID تحتاج مساحة أكبر
      } else {
        sheet.setColumnWidth(i, 150);
      }
    }
  }
  
  // مسح الورقة الافتراضية "Sheet1" إذا كانت فارغة للترتيب
  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("ورقة 1");
  if (defaultSheet && ss.getSheets().length > 1) {
    if (defaultSheet.getLastRow() === 0 && defaultSheet.getLastColumn() === 0) {
      ss.deleteSheet(defaultSheet);
    }
  }
  
  SpreadsheetApp.getUi().alert('✅ تم إنشاء جداول قاعدة البيانات بنجاح وبدقة عالية!');
}

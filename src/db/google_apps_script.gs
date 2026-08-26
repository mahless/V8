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

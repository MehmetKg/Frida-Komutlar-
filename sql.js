setImmediate(function() {
    Java.perform(function() {
        var sqliteDatabase = Java.use("android.database.sqlite.SQLiteDatabase");

        // execSQL(String sql)
        sqliteDatabase.execSQL.overload('java.lang.String').implementation = function(sql) {
            console.log("[*] SQLiteDatabase.execSQL called with query: " + sql);
            return this.execSQL(sql);
        };

        // execSQL(String sql, Object[] bindArgs)
        sqliteDatabase.execSQL.overload('java.lang.String', '[Ljava.lang.Object;').implementation = function(sql, bindArgs) {
            console.log("[*] SQLiteDatabase.execSQL called with query: " + sql + " and arguments: " + JSON.stringify(bindArgs));
            return this.execSQL(sql, bindArgs);
        };

        // rawQuery(String sql, String[] selectionArgs) 
        sqliteDatabase.rawQuery.overload('java.lang.String', '[Ljava.lang.String;').implementation = function(sql, selectionArgs) {
            console.log("[*] SQLiteDatabase.rawQuery called with query: " + sql + " and selectionArgs: " + JSON.stringify(selectionArgs));
            return this.rawQuery(sql, selectionArgs);
        };

        // insert(String table, String nullColumnHack, ContentValues values)
        sqliteDatabase.insert.overload('java.lang.String', 'java.lang.String', 'android.content.ContentValues').implementation = function(table, nullColumnHack, values) {
            console.log("[*] SQLiteDatabase.insert called. Table: " + table + ", Values: " + (values ? values.toString() : "null"));
            return this.insert(table, nullColumnHack, values);
        };

        // update(String table, ContentValues values, String whereClause, String[] whereArgs)
        sqliteDatabase.update.overload('java.lang.String', 'android.content.ContentValues', 'java.lang.String', '[Ljava.lang.String;').implementation = function(table, values, whereClause, whereArgs) {
            console.log("[*] SQLiteDatabase.update called. Table: " + table + ", Where: " + whereClause + ", WhereArgs: " + JSON.stringify(whereArgs) + ", Values: " + (values ? values.toString() : "null"));
            return this.update(table, values, whereClause, whereArgs);
        };

        // Basit query methodları - overload hatası olanları kaldırdım
        try {
            // query(String table, String[] columns, String selection, String[] selectionArgs, String groupBy, String having, String orderBy)
            sqliteDatabase.query.overload('java.lang.String', '[Ljava.lang.String;', 'java.lang.String', '[Ljava.lang.String;', 'java.lang.String', 'java.lang.String', 'java.lang.String').implementation = function(table, columns, selection, selectionArgs, groupBy, having, orderBy) {
                console.log("[*] SQLiteDatabase.query called. Table: " + table + ", Selection: " + selection + ", SelectionArgs: " + JSON.stringify(selectionArgs));
                return this.query(table, columns, selection, selectionArgs, groupBy, having, orderBy);
            };
        } catch (e) {
            console.log("[!] Query overload 1 not available: " + e);
        }

        // Diğer query overload'larını ihtiyaca göre ekleyin
        console.log("[✅] SQLiteDatabase hooks installed successfully");

    });
});